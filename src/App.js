import React, { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import TransactionModal from './components/TransactionModal';
import ChartView from './components/ChartView';
import EditTransactionModal from './components/EditTransactionModal.js';
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
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const calendarRef = useRef(null);

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await axios.get(`${WEB_APP_URL}?action=getTransactions`);
      const transactions = response.data;
      setTransactions(transactions);

      const dailyMap = {};
      transactions.forEach((trans) => {
        const dateStr = trans.date.split('T')[0];
        const amount = parseInt(trans.amount);
        const vatIn = parseInt(trans.vatInput) || 0;
        const vatOut = parseInt(trans.vatOutput) || 0;
        const netAmount =
          trans.type === '수입' || trans.type === '현금유입'
            ? amount - vatOut
            : trans.type === '경비' || trans.type === '현금유출'
            ? amount - vatIn
            : 0;

        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { income: 0, expense: 0 };
        }

        if (trans.type === '수입' || trans.type === '현금유입') {
          dailyMap[dateStr].income += netAmount;
        } else if (trans.type === '경비' || trans.type === '현금유출') {
          dailyMap[dateStr].expense += netAmount;
        }
      });

      const calendarEvents = Object.entries(dailyMap).map(([date, { income, expense }]) => ({
        title: '',
        date,
        income,
        expense,
      }));

      setEvents(calendarEvents);

      if (selectedDate) {
        const filtered = transactions.filter((trans) => {
          const matchDate = trans.date.split('T')[0] === selectedDate;
          const includeType =
            trans.type === '수입' ||
            trans.type === '현금유입' ||
            trans.type === '경비' ||
            trans.type === '현금유출';
          return matchDate && includeType;
        });
        setSelectedTransactions(filtered);
      }
    } catch (error) {
      console.error('거래내역 조회 오류:', error);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

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
    const filtered = transactions.filter((trans) => {
      const matchDate = trans.date.split('T')[0] === formattedDate;
      const includeType =
        trans.type === '수입' ||
        trans.type === '현금유입' ||
        trans.type === '경비' ||
        trans.type === '현금유출';
      return matchDate && includeType;
    });
    setSelectedTransactions(filtered);
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
    fetchTransactions();
  };

  const handleEditModalClose = () => {
    setSelectedTransactionId(null);
  };

  const handleTransactionClick = (id) => {
    setSelectedTransactionId(id);
  };

  const getMonthlySummary = () => {
    const filtered = transactions.filter((t) => {
      const date = new Date(t.date);
      return (
        date.getFullYear() === selectedYear &&
        date.getMonth() + 1 === selectedMonth
      );
    });

    let income = 0;
    let expense = 0;

    filtered.forEach((t) => {
      const amount = parseInt(t.amount) || 0;
      const vatInput = parseInt(t.vatInput) || 0;
      const vatOutput = parseInt(t.vatOutput) || 0;

      if (t.type === '수입') {
        income += amount - vatOutput;
      } else if (t.type === '경비') {
        expense += amount - vatInput;
      }
    });

    return { income, expense, total: income - expense };
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

        {(() => {
          const { income, expense, total } = getMonthlySummary();
          return (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <div
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  color: total >= 0 ? 'limegreen' : 'tomato',
                }}
              >
                {total >= 0 ? '' : '-'}
                {Math.abs(total).toLocaleString()}원
              </div>
              <div
                style={{
                  fontSize: '1.1rem',
                  marginTop: '0.5rem',
                  color: '#333',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '2rem',
                }}
              >
                <span>
                  <span style={{ color: '#666' }}>수입 </span>
                  <span style={{ color: 'limegreen' }}>{income.toLocaleString()}원</span>
                </span>
                <span>
                  <span style={{ color: '#666' }}>경비 </span>
                  <span style={{ color: 'tomato' }}>{expense.toLocaleString()}원</span>
                </span>
              </div>
            </div>
          );
        })()}
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
                        style={{ color: ['수입', '현금유입'].includes(trans.type) ? 'limegreen' : 'tomato', cursor: 'pointer' }}
                        onClick={() => handleTransactionClick(trans.id)}
                      >
                        {['수입', '현금유입'].includes(trans.type) ? '+' : '-'}
                        {trans.amount.toLocaleString()}
                      </td>
                      <td
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleTransactionClick(trans.id)}
                      >
                        {['수입', '현금유입'].includes(trans.type)
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
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                {months.map((month) => (
                  <option key={month} value={month}>{month}월</option>
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
          key={selectedTransactionId}
          id={selectedTransactionId}
          onClose={handleEditModalClose}
          onUpdate={fetchTransactions}
          webAppUrl={WEB_APP_URL}
        />
      )}

    </div>
  );
}

export default App;
