import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import TransactionModal from './components/TransactionModal';
import ChartView from './components/ChartView';
import axios from 'axios';
import './styles.css';

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzKfD5wD0aRa6cCT71oWzHaMCZ5kRe7jiGAdq-jmzSMn8N9fK6UOsxI1OB0KLcEqRxB/exec';

function App() {
  const [showModal, setShowModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const calendarRef = useRef(null);

  // 거래내역 조회
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await axios.get(`${WEB_APP_URL}?action=getTransactions`);
        const transactions = response.data;
        const calendarEvents = transactions.map((trans) => ({
          title: `${trans.description} (${trans.amount}원)`,
          date: trans.date,
        }));
        setEvents(calendarEvents);
      } catch (error) {
        console.error('거래내역 조회 오류:', error);
      }
    };
    fetchTransactions();
  }, []);

  // 캘린더 날짜 표시 클릭 이벤트 추가
  useEffect(() => {
    const titleElement = document.querySelector('.fc-toolbar-title');
    if (titleElement) {
      const handleClick = () => setShowDatePicker(true);
      titleElement.addEventListener('click', handleClick);
      return () => titleElement.removeEventListener('click', handleClick);
    }
  }, []);

  const handleDateClick = (arg) => {
    const formattedDate = arg.dateStr;
    setSelectedDate(formattedDate);
    setShowModal(true);
  };

  const handleDateSelect = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`);
    }
    setShowDatePicker(false);
  };

  const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="app">
      <header>
        <button
          className="toggle-btn"
          onClick={() => setActiveTab(activeTab === 'calendar' ? 'chart' : 'calendar')}
        >
          {activeTab === 'calendar' ? '📊' : '📅'}
        </button>
        <h1>복식부기 가계부</h1>
      </header>

      {activeTab === 'chart' ? (
        <ChartView />
      ) : (
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          dateClick={handleDateClick}
          headerToolbar={{
            left: 'prev',
            center: 'title',
            right: 'next',
          }}
          datesSet={(dateInfo) => {
            setSelectedYear(dateInfo.view.currentStart.getFullYear());
            setSelectedMonth(dateInfo.view.currentStart.getMonth() + 1);
          }}
        />
      )}

      <button className="add-btn" onClick={() => setShowModal(true)}>+</button>
      {showModal && (
        <TransactionModal
          onClose={() => setShowModal(false)}
          initialDate={selectedDate || new Date().toISOString().split('T')[0]}
        />
      )}

      {showDatePicker && (
        <div className="modal">
          <div className="modal-content">
            <h2>월 선택</h2>
            <div className="date-picker">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              >
                {months.map((month) => (
                  <option key={month} value={month}>
                    {month}월
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleDateSelect}>확인</button>
            <button onClick={() => setShowDatePicker(false)}>취소</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;