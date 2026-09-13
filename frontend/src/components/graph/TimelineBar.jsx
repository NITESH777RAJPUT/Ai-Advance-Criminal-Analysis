import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  Phone,
  Landmark,
  Users,
  MapPin,
  Calendar,
  AlertCircle,
  Zap,
  RotateCcw
} from 'lucide-react';

export const TimelineBar = ({
  events = [],
  onTimeChange,
  onSelectEvent,
  activeEventId
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(events.length > 0 ? events.length - 1 : 0);
  const [speed, setSpeed] = useState(1); // 1x, 2x, 5x
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const timerRef = useRef(null);

  const filteredEvents = selectedCategory === 'ALL'
    ? events
    : events.filter((e) => e.category === selectedCategory);

  const currentEvent = filteredEvents[currentIndex] || filteredEvents[0] || null;

  // Notify parent of active event changes
  useEffect(() => {
    if (currentEvent) {
      onTimeChange?.(currentEvent);
    }
  }, [currentIndex, selectedCategory, events]);

  // Autoplay loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(800, 2400 / speed);
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= filteredEvents.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isPlaying, speed, filteredEvents.length]);

  const handleStepPrev = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleStepNext = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.min(filteredEvents.length - 1, prev + 1));
  };

  const handleSliderChange = (e) => {
    setIsPlaying(false);
    setCurrentIndex(Number(e.target.value));
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Calls':
        return <Phone className="w-3 h-3 text-amber-400" />;
      case 'Transactions':
        return <Landmark className="w-3 h-3 text-purple-400" />;
      case 'Meetings':
        return <Users className="w-3 h-3 text-cyan-400" />;
      case 'Location Events':
        return <MapPin className="w-3 h-3 text-blue-400" />;
      default:
        return <Clock className="w-3 h-3 text-slate-400" />;
    }
  };

  return (
    <div className="bg-intel-900/95 backdrop-blur-xl border-t border-intel-800 px-4 py-3 shadow-2xl select-none z-20 flex flex-col space-y-2.5">
      {/* Top Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Playback Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-intel-950 border border-intel-800 rounded-lg p-1">
            <button
              onClick={handleStepPrev}
              disabled={currentIndex <= 0}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-intel-850 disabled:opacity-30"
              title="Step Back"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1 rounded font-mono font-bold text-xs flex items-center space-x-1.5 transition-all ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 shadow-glow-amber'
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-glow-cyan'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY TIMELINE'}</span>
            </button>

            <button
              onClick={handleStepNext}
              disabled={currentIndex >= filteredEvents.length - 1}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-intel-850 disabled:opacity-30"
              title="Step Forward"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center space-x-1 bg-intel-950 border border-intel-800 rounded-lg p-1 font-mono text-[10px]">
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  speed === s
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          <span className="text-[10px] font-mono text-slate-500 mr-1 uppercase">Event Type:</span>
          {['ALL', 'Calls', 'Transactions', 'Meetings', 'Location Events'].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentIndex(0);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all flex items-center space-x-1.5 ${
                selectedCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'bg-intel-950 text-slate-400 hover:text-slate-200 border border-intel-800'
              }`}
            >
              {cat !== 'ALL' && getCategoryIcon(cat)}
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* Current Date Display */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-slate-500">ACTIVE INTERCEPT:</span>
          <span className="px-2 py-0.5 rounded bg-intel-950 border border-cyan-500/40 text-cyan-300 font-bold">
            {currentEvent ? `${currentEvent.date} ${currentEvent.time}` : '2026-08-20'}
          </span>
        </div>
      </div>

      {/* Scrubber Range Slider with Tick Indicators */}
      <div className="relative pt-1 pb-2">
        <input
          type="range"
          min="0"
          max={filteredEvents.length - 1}
          value={currentIndex}
          onChange={handleSliderChange}
          className="w-full h-1.5 bg-intel-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-intel-800"
        />

        {/* Tick labels */}
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1">
          {filteredEvents.map((evt, idx) => (
            <button
              key={evt.id}
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex(idx);
              }}
              className={`transition-colors truncate max-w-[120px] ${
                idx === currentIndex ? 'text-cyan-400 font-bold' : 'hover:text-slate-300'
              }`}
            >
              {evt.date.substring(5)}: {evt.title}
            </button>
          ))}
        </div>
      </div>

      {/* Active Intercept Detail Card Banner */}
      {currentEvent && (
        <div className="p-2.5 rounded-xl bg-intel-950/90 border border-intel-800 flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-intel-850 border border-intel-700 flex items-center justify-center">
              {getCategoryIcon(currentEvent.category)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-100">{currentEvent.title}</span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                    currentEvent.threat === 'CRITICAL'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {currentEvent.threat}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {currentEvent.date} @ {currentEvent.time}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {currentEvent.description}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onSelectEvent?.(currentEvent)}
              className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-mono text-[10px] transition-colors"
            >
              Illuminate Nodes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineBar;

