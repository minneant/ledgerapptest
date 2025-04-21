import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import TransactionModal from './components/TransactionModal';
import ChartView from './components/ChartView';
import axios from 'axios';
import './styles.css';

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw0kQYuq1Zr5GN3T1yi7vBxrWamsMaB6lBzTMnubGPQMtdQEK1lgs986sun8I5mIU-c/exec';

function App() {
  const [showModal, setShowModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const calendarRef = useRef(null);

  // 📌 거래내역 불러오는 함수
  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${WEB_APP_URL}?action=getTransactions`);
      const transactions = response.data;

      const dailyMap = {};

      transactions.forEach((trans) => {
        const dateStr = trans.date.split('T')[0];
        const amount = parseInt(trans.amount);

        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { income: 0, expense: 0 };
        }

        if (trans.type === '+') {
          dailyMap[dateStr].income += amount;
        } else if (trans.type === '-') {
          dailyMap[dateStr].expense += amount;
        }
      });

      const calendarEvents = Object.entries(dailyMap).map(([date, { income, expense }]) => ({
        title: '',
        date,
        income,
        expense,
      }));

      setEvents(calendarEvents);
    } catch (error) {
      console.error('거래내역 조회 오류:', error);
    }
  };

  // 🚀 최초 실행 시 거래내역 로딩
  useEffect(() => {
    fetchTransactions();
  }, []);

  // 📆 제목 클릭 시 월선택 모달 열기
  useEffect(() => {
    if (activeTab === 'calendar') {
      const timer = setTimeout(() => {
        const titleElement = document.querySelector('.fc-toolbar-title');
        if (titleElement) {
          const handleClick = () => setShowDatePicker(true);
          titleElement.addEventListener('click', handleClick);
          return () => titleElement.removeEventListener('click', handleClick);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const handleDateClick = (arg) => {
    const formattedDate = arg.dateStr;
    setSelectedDate(formattedDate);
    setShowModal(false);
  };
  // 해당 날짜에만 하이라이트 스타일 적용
  const getDayCellClassNames = (arg) => {
    if (selectedDate === arg.dateStr) {
      return ['selected-date'];
   }
    return [];
  };
  // 선택 날짜의 거래 필터링
  const selectedTransactions = events
    .filter(event => event.raw?.date === selectedDate)
    .map(event => event.raw); // raw에 원본 거래정보가 들어있도록 fetch 시 넣어줬음

  const handleDateSelect = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`);
    }
    setShowDatePicker(false);
  };

  const handleModalClose = () => {
    setShowModal(false);
    fetchTransactions(); // 💥 거래내역 다시 불러오기
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
          eventBackgroundColor="transparent"
          eventBorderColor="transparent"
          eventDisplay="block"

          eventContent={(arg) => {
            const { income = 0, expense = 0 } = arg.event.extendedProps;
            return (
              <div style={{ textAlign: 'left', fontSize: '0.75rem' }}>
                {income > 0 && (
                  <div style={{ color: 'limegreen' }}>+{income.toLocaleString()}원</div>
                )}
                {expense > 0 && (
                  <div style={{ color: 'tomato' }}>-{expense.toLocaleString()}원</div>
                )}
              </div>
            );
          }}
          datesSet={(dateInfo) => {
            setSelectedYear(dateInfo.view.currentStart.getFullYear());
            setSelectedMonth(dateInfo.view.currentStart.getMonth() + 1);
          }}
        />
        {selectedDate && selectedTransactions.length > 0 && (
          <div className="transaction-details">
            <h3>{selectedDate} 거래내역</h3>
            <ul>
              {selectedTransactions.map((trans, index) => (
                <li key={index} className="transaction-item">
                  <span className="account">{trans.debitAccount}</span>
                  <span className="description">{trans.description}</span>
                  <span className="amount">{Number(trans.amount).toLocaleString()}원</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      )}

      <button className="add-btn" onClick={() => setShowModal(true)}>+</button>

      {showModal && (
        <TransactionModal
          onClose={handleModalClose} // ✅ 모달 닫을 때 거래내역 갱신
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

      <div className="version">v001</div>
    </div>
  );
}

export default App;
