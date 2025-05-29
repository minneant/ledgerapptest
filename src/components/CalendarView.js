import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzKfD5wD0aRa6cCT71oWzHaMCZ5kRe7jiGAdq-jmzSMn8N9fK6UOsxI1OB0KLcEqRxB/exec"; // 네가 배포한 Apps Script 웹앱 URL로 변경

const CalendarView = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${WEB_APP_URL}?action=getTransactions`
        );
        const transactions = response.data;
        const calendarEvents = transactions.map((trans) => ({
          title: `${trans.description} (${trans.amount}원)`,
          start: trans.date,
        }));
        setEvents(calendarEvents);
      } catch (error) {
        console.error("거래내역 조회 오류:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="calendar-view">
      <h2>달력 뷰</h2>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
      />
    </div>
  );
};

export default CalendarView;
