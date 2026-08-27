import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2
} from 'lucide-react';

export const CalendarView: React.FC = () => {
  const { tasks, setSelectedTaskId, setIsNewTaskModalOpen } = useApp();

  // Current calendar month view state (Defaulting to August 2026 as per anchor date)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(7); // 0-indexed: 7 is August

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(2026);
    setCurrentMonth(7);
  };

  // Generate calendar days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Days grid
  const days = [];

  // Prev month padding days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    days.push({
      day: daysInPrevMonth - i,
      month: currentMonth - 1,
      year: currentYear,
      isCurrentMonth: false
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      month: currentMonth,
      year: currentYear,
      isCurrentMonth: true
    });
  }

  // Next month padding days to complete 35 or 42 grid cells
  const remainingCells = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      day: i,
      month: currentMonth + 1,
      year: currentYear,
      isCurrentMonth: false
    });
  }

  const getTasksForDate = (year: number, month: number, day: number) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    return tasks.filter(t => t.dueDate === dateStr);
  };

  const isToday = (year: number, month: number, day: number) => {
    return year === 2026 && month === 7 && day === 27;
  };

  return (
    <div id="calendar-view" className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {monthNames[currentMonth]} {currentYear}
          </h3>
        </div>

        <button
          onClick={() => setIsNewTaskModalOpen(true)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-center py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
          {days.map((d, index) => {
            const dateTasks = getTasksForDate(d.year, d.month, d.day);
            const today = isToday(d.year, d.month, d.day);

            return (
              <div
                key={index}
                className={`min-h-[105px] sm:min-h-[125px] p-2 transition-colors ${
                  !d.isCurrentMonth
                    ? 'bg-slate-50/40 dark:bg-slate-950/20 text-slate-400 dark:text-slate-600'
                    : 'bg-white dark:bg-slate-900'
                } ${today ? 'ring-2 ring-blue-600 ring-inset bg-blue-50/20 dark:bg-blue-950/20' : ''}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                      today
                        ? 'bg-blue-600 text-white'
                        : d.isCurrentMonth
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400'
                    }`}
                  >
                    {d.day}
                  </span>

                  {dateTasks.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                      {dateTasks.length} {dateTasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  )}
                </div>

                {/* Task chips */}
                <div className="space-y-1 overflow-y-auto max-h-[85px] pr-0.5">
                  {dateTasks.map(task => {
                    const statusColors = {
                      todo: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
                      in_progress: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                      review: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                      done: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 line-through opacity-70'
                    };

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border truncate cursor-pointer hover:shadow-xs transition-all ${
                          statusColors[task.status]
                        }`}
                        title={`${task.title} (${task.status})`}
                      >
                        {task.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
