import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbw0kQYuq1Zr5GN3T1yi7vBxrWamsMaB6lBzTMnubGPQMtdQEK1lgs986sun8I5mIU-c/exec";

const toDateOnly = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const parseAmount = (value) => Number(value) || 0;

const csvEscape = (value) => {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const normalizeLedgerEntries = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      if (Array.isArray(row)) {
        return {
          id: row[0],
          quarter: row[1],
          month: row[2],
          date: row[3],
          description: row[4],
          note: row[5],
          account: row[6],
          debit: row[7],
          credit: row[8],
        };
      }
      return {
        id: row.id,
        quarter: row.quarter,
        month: row.month,
        date: row.date,
        description: row.description,
        note: row.note,
        account: row.account || row.accountName || row.account_name,
        debit: row.debit,
        credit: row.credit,
      };
    })
    .filter((entry) => entry.account);
};

function ChartView() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [debitAccount, setDebitAccount] = useState("");
  const [creditAccount, setCreditAccount] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${WEB_APP_URL}?action=getLedger`);
        setTransactions(normalizeLedgerEntries(response.data));
      } catch (error) {
        console.error("복식부기장부 조회 오류:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const accountOptions = useMemo(() => {
    const set = new Set();
    transactions.forEach((entry) => {
      if (entry.account) set.add(entry.account);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

    return transactions.filter((entry) => {
      const entryDate = new Date(entry.date);
      if (Number.isNaN(entryDate.getTime())) return false;

      if (start && entryDate < start) return false;
      if (end && entryDate > end) return false;

      if (
        debitAccount &&
        (entry.account !== debitAccount || parseAmount(entry.debit) <= 0)
      ) {
        return false;
      }
      if (
        creditAccount &&
        (entry.account !== creditAccount || parseAmount(entry.credit) <= 0)
      ) {
        return false;
      }

      return true;
    });
  }, [transactions, startDate, endDate, debitAccount, creditAccount]);

  const accountSummary = useMemo(() => {
    const map = new Map();
    filteredTransactions.forEach((entry) => {
      const account = entry.account;
      if (!account) return;
      const debit = parseAmount(entry.debit);
      const credit = parseAmount(entry.credit);
      const prev = map.get(account) || { debit: 0, credit: 0 };
      map.set(account, {
        debit: prev.debit + debit,
        credit: prev.credit + credit,
      });
    });

    return Array.from(map.entries())
      .map(([account, sums]) => ({ account, ...sums }))
      .sort((a, b) => a.account.localeCompare(b.account));
  }, [filteredTransactions]);

  const totals = useMemo(() => {
    return accountSummary.reduce(
      (acc, row) => ({
        debit: acc.debit + row.debit,
        credit: acc.credit + row.credit,
      }),
      { debit: 0, credit: 0 }
    );
  }, [accountSummary]);

  const handleExport = () => {
    const header = [
      "date",
      "account",
      "debit",
      "credit",
      "description",
      "note",
      "id",
    ];
    const rows = filteredTransactions.map((entry) => [
      toDateOnly(entry.date),
      entry.account,
      parseAmount(entry.debit),
      parseAmount(entry.credit),
      entry.description,
      entry.note,
      entry.id,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const labelStart = startDate || "all";
    const labelEnd = endDate || "all";
    link.href = url;
    link.download = `ledger_${labelStart}_${labelEnd}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "12px" }}>
      <div style={{ marginBottom: "12px" }}>
        <h2 style={{ margin: 0 }}>기간/계정별 차변·대변 합계</h2>
        <p style={{ margin: "6px 0 0", color: "#666" }}>
          기간과 계정을 선택하면 해당 기간의 계정별 합계를 확인할 수
          있습니다.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <label>
          시작일
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: "100%", padding: "6px", marginTop: "6px" }}
          />
        </label>
        <label>
          종료일
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: "100%", padding: "6px", marginTop: "6px" }}
          />
        </label>
        <label>
          차변 계정
          <select
            value={debitAccount}
            onChange={(e) => setDebitAccount(e.target.value)}
            style={{ width: "100%", padding: "6px", marginTop: "6px" }}
          >
            <option value="">전체</option>
            {accountOptions.map((account) => (
              <option key={`debit-${account}`} value={account}>
                {account}
              </option>
            ))}
          </select>
        </label>
        <label>
          대변 계정
          <select
            value={creditAccount}
            onChange={(e) => setCreditAccount(e.target.value)}
            style={{ width: "100%", padding: "6px", marginTop: "6px" }}
          >
            <option value="">전체</option>
            {accountOptions.map((account) => (
              <option key={`credit-${account}`} value={account}>
                {account}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <button
          onClick={handleExport}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          기간별 장부 CSV 내보내기
        </button>
      </div>

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ textAlign: "left", padding: "8px" }}>계정</th>
                <th style={{ textAlign: "right", padding: "8px" }}>
                  차변 합계
                </th>
                <th style={{ textAlign: "right", padding: "8px" }}>
                  대변 합계
                </th>
              </tr>
            </thead>
            <tbody>
              {accountSummary.map((row) => (
                <tr key={row.account}>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {row.account}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      textAlign: "right",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {row.debit.toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      textAlign: "right",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {row.credit.toLocaleString()}
                  </td>
                </tr>
              ))}
              {accountSummary.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: "12px", color: "#666" }}>
                    조건에 해당하는 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
            {accountSummary.length > 0 && (
              <tfoot>
                <tr style={{ background: "#fafafa", fontWeight: "bold" }}>
                  <td style={{ padding: "8px" }}>합계</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    {totals.debit.toLocaleString()}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    {totals.credit.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

export default ChartView;
