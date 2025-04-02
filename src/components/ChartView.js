import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzKfD5wD0aRa6cCT71oWzHaMCZ5kRe7jiGAdq-jmzSMn8N9fK6UOsxI1OB0KLcEqRxB/exec';

function ChartView() {
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${WEB_APP_URL}?action=getTransactions`);
        const transactions = response.data;

        const debitSums = {};
        const creditSums = {};
        transactions.forEach((trans) => {
          debitSums[trans.debitAccount] = (debitSums[trans.debitAccount] || 0) + Number(trans.amount);
          creditSums[trans.creditAccount] = (creditSums[trans.creditAccount] || 0) + Number(trans.amount);
        });

        const labels = [...new Set([...Object.keys(debitSums), ...Object.keys(creditSums)])];
        setChartData({
          labels,
          datasets: [
            {
              label: '차변 합계',
              data: labels.map(label => debitSums[label] || 0),
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1,
            },
            {
              label: '대변 합계',
              data: labels.map(label => creditSums[label] || 0),
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 1,
            },
          ],
        });
      } catch (error) {
        console.error('거래내역 조회 오류:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <h2>계정별 거래 내역</h2>
      <Bar data={chartData} />
    </div>
  );
}

export default ChartView;