import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import TransactionModal from './components/TransactionModal';
import ChartView from './components/ChartView';
import EditTransactionModal from './components/EditTransactionModal'; // 새 모달 임포트
import axios from 'axios';
import './styles.css';

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw0kQYuq1Zr5GN3T1yi7vBxrWamsMaB6lBzTMnubGPQMtdQEK1lgs986sun8I5mIU-c/exec';

function App() {
  const [showModal, setShowModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedTransactionId, setSelectedTransactionId] = useState(null); // 선택된 거래 ID
  const calendarRef = useRef(null);

  // 📌 거래내역 불러오는 함수
  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${WEB_APP_URL}?action=getTransactions`);
      const transactions = response.data;
      setTransactions(transactions); // 전체 거래 내역 저장

      const dailyMap = {};

      transactions.forEach((trans) => {
        const dateStr = trans.date.split('T')[0];
        const amount = parseInt(trans.amount);

        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { income: 0, expense: 0 };
        }

        if (trans.type === '수입') {
          dailyMap[dateStr].income += amount;
        } else if (trans.type === '지출') {
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

      // 선택된 날짜가 있으면 거래 내역 필터링 업데이트
      if (selectedDate) {
        const filteredTransactions = transactions.filter(
          (trans) => trans.date.split('T')[0] === selectedDate
        );
        setSelectedTransactions(filteredTransactions);
      }
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
    // 선택한 날짜의 거래 내역 필터링
    const filteredTransactions = transactions.filter(
      (trans) => trans.date.split('T')[0] === formattedDate
    );
    setSelectedTransactions(filteredTransactions);
    // 하이라이트를 위해 FullCalendar 날짜 셀 업데이트
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.refetchEvents();
    }
  };

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

  const handleEditModalClose = () => {
    setSelectedTransactionId(null);
  };

  const handleTransactionClick = (id) => {
    setSelectedTransactionId(id); // 거래 ID 설정
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
        <>
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
                <div style={{ textAlign: 'left' }}>
                  {income > 0 && (
                    <div style={{ color: 'limegreen' }}>+{income.toLocaleString()}</div>
                  )}
                  {expense > 0 && (
                    <div style={{ color: 'tomato' }}>-{expense.toLocaleString()}</div>
                  )}
                </div>
              );
            }}
            datesSet={(dateInfo) => {
              setSelectedYear(dateInfo.view.currentStart.getFullYear());
              setSelectedMonth(dateInfo.view.currentStart.getMonth() + 1);
            }}
          />
          <div className="transaction-list">
            <h2>{selectedDate ? `${selectedDate} 거래 내역` : '날짜를 선택하세요'}</h2>
            {selectedTransactions.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>금액</th>
                    <th>계정</th>
                    <th>메모</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransactions.map((trans, index) => (
                    <tr key={index}>
                      <td
                        style={{ color: trans.type === '수입' ? 'limegreen' : 'tomato', cursor: 'pointer' }}
                        onClick={() => handleTransactionClick(trans.id)}
                      >
                        {trans.type === '수입' ? '+' : '-'}{trans.amount.toLocaleString()}
                      </td>
                      <td
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleTransactionClick(trans.id)}
                      >
                        {trans.type === '수입'
                          ? (trans.creditAccount.includes('.') ? trans.creditAccount.split('.').pop() : trans.creditAccount)
                          : (trans.debitAccount.includes('.') ? trans.debitAccount.split('.').pop() : trans.debitAccount)}
                      </td>
                      <td
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleTransactionClick(trans.id)}
                      >
                        {trans.note || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>선택한 날짜에 거래 내역이 없습니다.</p>
            )}
          </div>
        </>
      )}

      <button className="add-btn" onClick={() => setShowModal(true)}>+</button>

      {showModal && (
        <TransactionModal
          onClose={handleModalClose}
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

      {selectedTransactionId && (
        <EditTransactionModal
          id={selectedTransactionId}
          onClose={handleEditModalClose}
          onUpdate={fetchTransactions} // 거래 목록 새로고침
          webAppUrl = {WEB_APP_URL} // 추가가
        />
      )}

      <div className="version">v000</div>
    </div>
  );
}

export default App;