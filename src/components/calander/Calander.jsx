import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, X, Star } from 'lucide-react';
import journalEntries from '../data/journalData';
// Date utility functions
const dateUtils = {
        format: (date, format) => {
                const d = new Date(date);
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                
                if (format === 'MMM YYYY') 
                        return `${months[d.getMonth()]} ${d.getFullYear()}`
                if (format === 'YYYY-MM') 
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                if (format === 'YYYY-MM-DD') 
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                if (format === 'D') 
                        return String(d.getDate())
                if (format === 'D MMMM') 
                        return `${d.getDate()} ${fullMonths[d.getMonth()]}`
                return d.toISOString().split('T')[0]
        },
  
        startOfMonth: (date) => {
                const d = new Date(date);
                return new Date(d.getFullYear(), d.getMonth(), 1)
        },
  
        endOfMonth: (date) => {
                const d = new Date(date);
                return new Date(d.getFullYear(), d.getMonth() + 1, 0)
        },
  
        startOfWeek: (date) => {
                const d = new Date(date)
                const day = d.getDay()
                const diff = d.getDate() - day
                return new Date(d.setDate(diff))
        },
  
        endOfWeek: (date) => {
                const d = new Date(date)
                const day = d.getDay()
                const diff = d.getDate() - day + 6
                return new Date(d.setDate(diff))
        },
  
        addMonths: (date, months) => {
                const d = new Date(date)
                d.setMonth(d.getMonth() + months)
                return d
        },
  
        addDays: (date, days) => {
                const d = new Date(date)
                d.setDate(d.getDate() + days)
                return d
        },
  
        isSame: (date1, date2, unit = 'day') => {
                const d1 = new Date(date1);
                const d2 = new Date(date2);
                
                if (unit === 'month') {
                        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()
                }
                if (unit === 'day') {
                        return d1.toDateString() === d2.toDateString()
                }
                return false
        },
  
        isBefore: (date1, date2) => {
                return new Date(date1) < new Date(date2)
        },
  
        subtract: (date, amount, unit) => {
        if (unit === 'month') {
                return dateUtils.addMonths(date, -amount)
        }
                return dateUtils.addDays(date, -amount)
        }
}


// Category colors
const categoryColors = {
  'W': 'bg-purple-100 text-purple-600',
  'DC': 'bg-pink-100 text-pink-600',
  'C': 'bg-green-100 text-green-600',
  'Pr': 'bg-yellow-100 text-yellow-600',
  'R': 'bg-blue-100 text-blue-600',
  '1': 'bg-indigo-100 text-indigo-600',
  '2': 'bg-cyan-100 text-cyan-600',
  '3': 'bg-orange-100 text-orange-600'
}

// Custom swipe hook
const useSwipeGesture = (onSwipeLeft, onSwipeRight) => {

        const [touchStart, setTouchStart] = useState(null)
        const [touchEnd, setTouchEnd] = useState(null)

        const minSwipeDistance = 50

        const onTouchStart = (e) => {
                setTouchEnd(null)
                setTouchStart(e.targetTouches[0].clientX)
        }

        const onTouchMove = (e) => {
                setTouchEnd(e.targetTouches[0].clientX);
        }

        const onTouchEnd = () => {
                if (!touchStart || !touchEnd) 
                        return
                const distance = touchStart - touchEnd
                const isLeftSwipe = distance > minSwipeDistance
                const isRightSwipe = distance < -minSwipeDistance

                if (isLeftSwipe && onSwipeLeft) {
                        onSwipeLeft()
                }
                if (isRightSwipe && onSwipeRight) {
                        onSwipeRight()
                }
        }

        // Mouse events for desktop
        const [mouseStart, setMouseStart] = useState(null)
        const [mouseEnd, setMouseEnd] = useState(null)
        const [isDragging, setIsDragging] = useState(false)

        const onMouseDown = (e) => {
                setMouseEnd(null)
                setMouseStart(e.clientX);
                setIsDragging(true);
        }

        const onMouseMove = (e) => {
                if (!isDragging) 
                        return
                setMouseEnd(e.clientX)
        }

        const onMouseUp = () => {
                if (!isDragging || !mouseStart || !mouseEnd) {
                        setIsDragging(false)
                        return
                }
                
                const distance = mouseStart - mouseEnd
                const isLeftSwipe = distance > minSwipeDistance
                const isRightSwipe = distance < -minSwipeDistance

                if (isLeftSwipe && onSwipeLeft) {
                        onSwipeLeft()
                }
                if (isRightSwipe && onSwipeRight) {
                        onSwipeRight()
                }
                
                setIsDragging(false)
        }

        return {
                onTouchStart,
                onTouchMove,
                onTouchEnd,
                onMouseDown,
                onMouseMove,
                onMouseUp
        }
}

const Calendar = () => {
        const [currentMonth, setCurrentMonth] = useState(new Date())
        const [selectedEntry, setSelectedEntry] = useState(null)
        const [currentEntryIndex, setCurrentEntryIndex] = useState(0)

        
        const scrollRef = useRef(null)
        const monthRefs = useRef({})

        // Generate months for infinite scroll
        const generateMonths = useCallback(() => {
                const months = []
                const today = new Date()
                const startMonth = dateUtils.subtract(today, 124, 'month')
                const endMonth = dateUtils.addMonths(today, 124)
                
                let current = new Date(startMonth)
                while (dateUtils.isBefore(current, endMonth) || dateUtils.isSame(current, endMonth, 'month')) {
                        months.push(new Date(current));
                        current = dateUtils.addMonths(current, 1);
                }
                return months
        }, [])

        const [months] = useState(generateMonths());

        // Get journal entries for a specific date
        const getEntriesForDate = useCallback((date) => {
                return journalEntries.filter(entry => 
                        dateUtils.isSame(entry.date, date, 'day')
                )
        }, []);

        // Generate calendar days for a month
        const generateCalendarDays = useCallback((month) => {
                const startOfMonth = dateUtils.startOfMonth(month)
                const endOfMonth = dateUtils.endOfMonth(month)
                const startOfWeek = dateUtils.startOfWeek(startOfMonth)
                const endOfWeek = dateUtils.endOfWeek(endOfMonth)

                const days = []
                let current = new Date(startOfWeek)

                while (dateUtils.isBefore(current, endOfWeek) || dateUtils.isSame(current, endOfWeek, 'day')) {
                        days.push(new Date(current))
                        current = dateUtils.addDays(current, 1)
                }

                return days
        }, [])

        // Handle scroll to update current month
        useEffect(() => {
                const handleScroll = () => {

                        if (!scrollRef.current) 
                                return

                        const scrollTop = scrollRef.current.scrollTop
                        const containerHeight = scrollRef.current.clientHeight
                        const viewportCenter = scrollTop + containerHeight / 2
                        

                        let closestMonth = months[0]
                        let minDistance = Infinity

                        months.forEach(month => {

                                const monthKey = dateUtils.format(month, 'YYYY-MM')
                                const monthElement = monthRefs.current[monthKey]
                                
                                if (monthElement) {
                                        const rect = monthElement.getBoundingClientRect()
                                        const containerRect = scrollRef.current.getBoundingClientRect();
                                        const monthTop = rect.top - containerRect.top + scrollTop;
                                        const monthCenter = monthTop + rect.height / 2;
                                        const distance = Math.abs(viewportCenter - monthCenter);

                                        if (distance < minDistance) {
                                                minDistance = distance
                                                closestMonth = month
                                        }
                                }
                        })

                        setCurrentMonth(closestMonth)
                }

                const scrollElement = scrollRef.current
                if (scrollElement) {
                        scrollElement.addEventListener('scroll', handleScroll, { passive: true })
                        return () => scrollElement.removeEventListener('scroll', handleScroll)
                }
        }, [months])

        // Handle journal entry click
        const handleEntryClick = (entry) => {
                const entryIndex = journalEntries.findIndex(e => e.date === entry.date)
                console.log(entryIndex);
                
                setCurrentEntryIndex(entryIndex)
                setSelectedEntry(entry)
        }

        // Swipe handlers for journal entry navigation
        const swipeHandlers = useSwipeGesture(
                () => {
                       
                        console.log('right swipe');
                        
                        if (currentEntryIndex < journalEntries.length - 1) {
                                console.log('right swipe');

                                
                                const nextIndex = currentEntryIndex + 1

                                console.log(nextIndex);
                                
                                setCurrentEntryIndex(nextIndex)
                                setSelectedEntry(journalEntries[nextIndex])
                        }
                },
                () => {
                        if (currentEntryIndex > 0) {
                                const prevIndex = currentEntryIndex - 1
                                console.log(prevIndex,"prevIndex left swipe");
                                
                                setCurrentEntryIndex(prevIndex);
                                setSelectedEntry(journalEntries[prevIndex])
                        }
                }
        )

        // Render calendar day
        const renderDay = useCallback((day, monthContext) => {
                const isCurrentMonth = dateUtils.isSame(day, monthContext, 'month')
                const entries = getEntriesForDate(day)
                const dayNumber = dateUtils.format(day, 'D')

                return (
                        <div key={dateUtils.format(day, 'YYYY-MM-DD')} className="bg-white border-r border-b border-gray-200 min-h-[120px] relative">
                                <div className={`text-sm p-2 ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {dayNumber}
                                </div>
                                {
                                entries.length > 0 && (
                                        <div className="absolute inset-x-2 top-2 left-6 bottom-2">
                                                {
                                                entries.map(entry => (
                                                <div
                                                        key={entry.id+"-"+entry.date}
                                                        className="relative cursor-pointer mb-1"
                                                        onClick={() => handleEntryClick(entry)}
                                                >
                                                        <img
                                                                src={entry.imgUrl}
                                                                alt="Hair diary entry"
                                                                className="w-16 h-16 object-cover rounded"
                                                        />
                                                        <div className="absolute top-1 left-1 flex gap-0.5">
                                                        {
                                                                Array.from({ length: entry.rating }, (_, i) => (
                                                                        <Star key={i} className="w-2.5 h-2.5 fill-blue-400 text-blue-400" />
                                                                ))
                                                        }
                                                        </div>
                                                        <div className=" bottom-1 left-1 flex gap-1">
                                                        {
                                                        entry.categories.map((cat, idx) => (
                                                                <span
                                                                        key={idx}
                                                                        className={`text-xs px-0.5 py-0.5 rounded-full ${categoryColors[cat] || 'bg-gray-100 text-gray-600'}`}
                                                                >
                                                                        {cat}
                                                                </span>
                                                                ))
                                                        }
                                                        </div>
                                                </div>
                                                ))
                                                }
                                        </div>
                                        )
                                }
                        </div>
                )
        }, [getEntriesForDate])

        // Render month calendar
        const renderMonth = useCallback((month) => {
                const days = generateCalendarDays(month)
                const monthKey = dateUtils.format(month, 'YYYY-MM')

                return (
                <div
                        key={monthKey}
                        ref={el => monthRefs.current[monthKey] = el}
                        className="mb-0"
                >
                        <div className="grid grid-cols-7 border-l border-t border-gray-200">
                         {
                                days.map(day => renderDay(day, month))
                        }
                        </div>
                </div>
                )
        }, [generateCalendarDays, renderDay]);

        return (
        <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
         
                <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                                 <ChevronLeft className="w-6 h-6 text-gray-600" />
                        <h1 className="text-lg font-medium text-blue-500">Quinn Calander</h1>
                        </div>
                        <div className="text-lg font-medium text-gray-900">
                        {
                                dateUtils.format(currentMonth, 'MMM YYYY')
                        }
                        </div>
                </div>

                {/* Fixed Weekday Header */}
                <div className="bg-white border-b border-gray-200 flex-shrink-0">
                        <div className="grid grid-cols-7 border-l border-gray-200">
                        {
                                ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                                        <div key={day+"header"+Math.random()} className="bg-gray-50 border-r border-gray-200 p-3 text-center text-sm font-medium text-gray-600">
                                                {day}
                                        </div>)
                                )
                        }
                        </div>
                </div>

                {/* Scrollable Calendar */}
                <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto"
                        style={{ scrollBehavior: 'smooth' }}
                >
                        {
                                months.map(month => renderMonth(month))
                        }
                </div>

        {/* Journal Entry Swipeable Overlay */}
        {selectedEntry && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center  justify-center ">
                        <div
                                {...swipeHandlers}
                                className="bg-white rounded-md p-2xl max-w-md w-full max-h-[75vh] overflow-hidden relative animate-slide-up select-none"
                        >
                                <button
                                        onClick={() => setSelectedEntry(null)}
                                        className="absolute top-4 right-4 z-10 bg-white bg-opacity-80 rounded-full p-2 cursor-pointer"
                                >
                                        <X className="w-5 h-5 text-gray-600" />
                                </button>

                                <div className="relative">
                                <img
                                        src={selectedEntry.imgUrl}
                                        alt="Hair diary entry"
                                        className="w-full h-72 object-cover"
                                />
                                
                                <div className="absolute top-4 left-4 flex gap-1">
                                        {
                                                Array.from({ length: selectedEntry.rating }, (_, i) => (
                                                        <Star key={i+"star"} className="w-4 h-4 fill-blue-400 text-blue-400" />
                                                ))
                                        }
                                </div>

                                <div className="absolute bottom-4 left-4 flex gap-2">
                                        {selectedEntry.categories.map((cat, idx) => (
                                        <span
                                                key={idx+"cat"+cat}
                                                className={ `text-sm px-2  p-2 rounded-full ${categoryColors[cat] || 'bg-gray-100 text-gray-600'}`}
                                        >
                                                {cat}
                                        </span>
                                        ))}
                                </div>
                        </div>

                        <div className="p-4">
                                <div className="text-xl font-medium text-gray-900 mb-3 my-8">
                                        {dateUtils.format(selectedEntry.date, 'D MMMM')}
                                </div>
                                <p className="text-gray-700 leading-relaxed my-4">
                                        {selectedEntry.description}
                                </p>
                        
                                <div className="mt-6 p-6 border-t border-gray-100 flex justify-center pt-4">
                                        <button className="text-blue-500 font-medium text-center">
                                                View full Post
                                        </button>
                                </div>
                        </div>
                        </div>
                </div>
        )}

                {/* Add button */}
                <div className="fixed bottom-6 right-6">
                        <button className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                                <div className="text-white text-2xl font-light">+</div>
                        </button>
                </div>

                <style 
                        jsx>{`
                                @keyframes slide-up {
                                from {
                                        transform: translateY(100%);
                                }
                                to {
                                        transform: translateY(0);
                                }
                                }
                                .animate-slide-up {
                                        animation: slide-up 0.3s ease-out;
                                }
                        `}
                </style>
        </div>
        )
}

export default Calendar