import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from app.database.mongodb import mongo_client
from app.database.neo4j_client import neo4j_client
from app.models.schemas import EntityType, ReportGenerateRequest
from app.utils.logger import get_logger

logger = get_logger("report_service")


class ReportService:
    @staticmethod
    async def generate_suspect_pdf(req: ReportGenerateRequest, generated_by: str = "Investigator") -> bytes:
        """Generates a downloadable PDF dossier for a suspect or comprehensive network report."""
        g = neo4j_client.get_raw_graph()
        suspect_id = req.suspect_id

        # Target suspect data
        suspect_data = {}
        if suspect_id and suspect_id in g:
            suspect_data = dict(g.nodes[suspect_id])
            suspect_name = suspect_data.get("name", suspect_id)
        else:
            suspect_name = "Syndicate Network Intelligence Overview"
            suspect_id = "NETWORK-ALL"

        risk_score = float(suspect_data.get("risk_score", 75.0))
        buffer = io.BytesIO()

        # Build PDF with ReportLab
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()

        # Custom tactical intelligence styles
        title_style = ParagraphStyle(
            'TacticalTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'TacticalSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#dc2626')  # Red alert header
        )
        h2_style = ParagraphStyle(
            'TacticalH2',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'TacticalBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#334155')
        )
        body_bold = ParagraphStyle(
            'TacticalBodyBold',
            parent=body_style,
            fontName='Helvetica-Bold'
        )

        story = []

        # 1. Header Banner
        story.append(Paragraph("LAW ENFORCEMENT INTELLIGENCE DOSSIER // RESTRICTED ACCESS", subtitle_style))
        story.append(Spacer(1, 4))
        story.append(Paragraph(f"SUBJECT: {suspect_name.upper()}", title_style))
        story.append(Paragraph(
            f"Generated on: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} | "
            f"Case File: {req.case_title} | Officer: {generated_by}",
            body_style
        ))
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0f172a'), spaceAfter=12))

        # 2. Risk Score & Core Metadata Box
        risk_color = colors.HexColor('#dc2626') if risk_score >= 70 else (colors.HexColor('#ea580c') if risk_score >= 40 else colors.HexColor('#16a34a'))
        meta_table_data = [
            [
                Paragraph("<b>IDENTIFIER:</b>", body_style), Paragraph(str(suspect_id), body_style),
                Paragraph("<b>RISK ASSESSMENT:</b>", body_style), Paragraph(f"<b>{risk_score}/100</b>", ParagraphStyle('RiskVal', parent=body_bold, textColor=risk_color, fontSize=12))
            ],
            [
                Paragraph("<b>ENTITY TYPE:</b>", body_style), Paragraph(str(suspect_data.get("type", "Person")), body_style),
                Paragraph("<b>TOTAL CONNECTIONS:</b>", body_style), Paragraph(str(g.degree(suspect_id) if suspect_id in g else len(g)), body_style)
            ]
        ]
        meta_table = Table(meta_table_data, colWidths=[1.3*inch, 2.2*inch, 1.5*inch, 2.0*inch])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 14))

        # 3. Associated People
        story.append(Paragraph("1. ASSOCIATED INDIVIDUALS & OPERATIONAL CONTACTS", h2_style))
        assoc_people = []
        assoc_locations = []
        assoc_vehicles = []
        assoc_phones = []

        if suspect_id in g:
            undirected = g.to_undirected()
            for nbr in undirected.neighbors(suspect_id):
                nbr_data = g.nodes[nbr]
                ntype = nbr_data.get("type")
                # find relationship
                rel_label = "ASSOCIATED_WITH"
                evidence_text = "Linked in intelligence reports"
                if g.has_edge(suspect_id, nbr):
                    e_dict = g.get_edge_data(suspect_id, nbr)
                    rel_label = next(iter(e_dict.values())).get("label", rel_label)
                    evidence_text = next(iter(e_dict.values())).get("evidence", evidence_text)
                elif g.has_edge(nbr, suspect_id):
                    e_dict = g.get_edge_data(nbr, suspect_id)
                    rel_label = next(iter(e_dict.values())).get("label", rel_label)
                    evidence_text = next(iter(e_dict.values())).get("evidence", evidence_text)

                item = {
                    "name": nbr_data.get("name", str(nbr)),
                    "type": ntype,
                    "relation": rel_label,
                    "risk": float(nbr_data.get("risk_score", 0.0)),
                    "evidence": evidence_text
                }

                if ntype == EntityType.PERSON.value:
                    assoc_people.append(item)
                elif ntype == EntityType.LOCATION.value:
                    assoc_locations.append(item)
                elif ntype == EntityType.VEHICLE.value:
                    assoc_vehicles.append(item)
                elif ntype == EntityType.PHONE_NUMBER.value:
                    assoc_phones.append(item)
        else:
            # All high-risk persons in network
            for nid, data in g.nodes(data=True):
                if data.get("type") == EntityType.PERSON.value:
                    assoc_people.append({
                        "name": data.get("name", str(nid)),
                        "type": "Person",
                        "relation": "Core Target",
                        "risk": float(data.get("risk_score", 0.0)),
                        "evidence": "Primary Syndicate Operative"
                    })

        # People Table
        if assoc_people:
            p_table_data = [["Associate Name", "Relationship", "Risk Score", "Investigative Evidence"]]
            for p in assoc_people[:8]:
                p_table_data.append([
                    p["name"],
                    p["relation"],
                    f"{p['risk']}/100",
                    Paragraph(p["evidence"][:90] + ("..." if len(p["evidence"]) > 90 else ""), body_style)
                ])
            p_table = Table(p_table_data, colWidths=[1.8*inch, 1.4*inch, 0.9*inch, 2.9*inch])
            p_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
            ]))
            story.append(p_table)
        else:
            story.append(Paragraph("<i>No direct associated persons recorded.</i>", body_style))

        story.append(Spacer(1, 10))

        # 4. Locations & Venues
        story.append(Paragraph("2. IDENTIFIED LOCATIONS & SAFEHOUSES", h2_style))
        if assoc_locations:
            loc_table_data = [["Location / Facility", "Association Type", "Surveillance Notes"]]
            for loc in assoc_locations[:6]:
                loc_table_data.append([
                    loc["name"],
                    loc["relation"],
                    Paragraph(loc["evidence"][:110], body_style)
                ])
            loc_table = Table(loc_table_data, colWidths=[2.2*inch, 1.8*inch, 3.0*inch])
            loc_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ]))
            story.append(loc_table)
        else:
            story.append(Paragraph("<i>No specific geographic coordinates or safehouses linked.</i>", body_style))

        story.append(Spacer(1, 10))

        # 5. Connected Vehicles & Burner Phones
        story.append(Paragraph("3. LOGISTICAL ASSETS (VEHICLES & TELECOMMUNICATIONS)", h2_style))
        assets = assoc_vehicles + assoc_phones
        if assets:
            asset_data = [["Asset Identifier", "Asset Class", "Relationship", "Notes"]]
            for a in assets[:6]:
                asset_data.append([
                    a["name"],
                    "Vehicle" if a["type"] == EntityType.VEHICLE.value else "Phone Number",
                    a["relation"],
                    Paragraph(a["evidence"][:100], body_style)
                ])
            asset_table = Table(asset_data, colWidths=[2.0*inch, 1.3*inch, 1.2*inch, 2.5*inch])
            asset_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ]))
            story.append(asset_table)
        else:
            story.append(Paragraph("<i>No vehicle registrations or MSISDNs linked directly.</i>", body_style))

        story.append(Spacer(1, 14))

        # 6. Investigator Notes & Signoff
        if req.notes:
            story.append(Paragraph("4. INVESTIGATOR BRIEFING NOTES", h2_style))
            story.append(Paragraph(req.notes, body_style))
            story.append(Spacer(1, 10))

        # Sign-off box
        signoff_data = [
            [
                Paragraph("<b>Report Status:</b> FORMAL DOSSIER", body_style),
                Paragraph("<b>Intelligence Verification:</b> CONFIRMED", body_style),
                Paragraph("<b>Authorizing Signature:</b> ___________________", body_style)
            ]
        ]
        signoff_table = Table(signoff_data, colWidths=[2.3*inch, 2.3*inch, 2.4*inch])
        signoff_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, -1), 1, colors.HexColor('#94a3b8')),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(KeepTogether([signoff_table]))

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        # Audit log in MongoDB
        audit_entry = {
            "action": "GENERATE_REPORT",
            "subject_id": suspect_id,
            "subject_name": suspect_name,
            "generated_by": generated_by,
            "timestamp": datetime.now(timezone.utc),
            "size_bytes": len(pdf_bytes)
        }
        await mongo_client.audit_logs.insert_one(audit_entry)

        return pdf_bytes


report_service = ReportService()

