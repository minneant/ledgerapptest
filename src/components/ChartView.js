import React, { useCallback, useEffect, useMemo, useState } from "react";
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

function ChartView({ onExport }) {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [debitAccounts, setDebitAccounts] = useState([]);
  const [creditAccounts, setCreditAccounts] = useState([]);
  const [debitSearch, setDebitSearch] = useState("");
  const [creditSearch, setCreditSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ledgerResponse, accountResponse] = await Promise.all([
          axios.get(`${WEB_APP_URL}?action=getLedger`),
          axios.get(`${WEB_APP_URL}?action=getAccounts`),
        ]);
        setTransactions(normalizeLedgerEntries(ledgerResponse.data));
        setAccounts(accountResponse.data || []);
      } catch (error) {
        console.error("복식부기장부 조회 오류:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const accountMetaMap = useMemo(() => {
    const map = new Map();
    accounts.forEach((acc) => {
      if (acc && acc.name) map.set(acc.name, acc);
    });
    return map;
  }, [accounts]);

  const accountOptions = useMemo(() => {
    if (accounts.length > 0) {
      return accounts
        .map((acc) => acc.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
    }
    const set = new Set();
    transactions.forEach((entry) => {
      if (entry.account) set.add(entry.account);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [accounts, transactions]);

  const incomeAccounts = useMemo(
    () =>
      accountOptions.filter(
        (name) => accountMetaMap.get(name)?.type === "수입"
      ),
    [accountOptions, accountMetaMap]
  );

  const expenseAccounts = useMemo(
    () =>
      accountOptions.filter(
        (name) => accountMetaMap.get(name)?.type === "비용"
      ),
    [accountOptions, accountMetaMap]
  );

  const vatAccounts = useMemo(
    () => accountOptions.filter((name) => name.includes("부가세")),
    [accountOptions]
  );

  const filteredTransactions = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

    return transactions.filter((entry) => {
      const entryDate = new Date(entry.date);
      if (Number.isNaN(entryDate.getTime())) return false;

      if (start && entryDate < start) return false;
      if (end && entryDate > end) return false;

      const debitFilterOn = debitAccounts.length > 0;
      const creditFilterOn = creditAccounts.length > 0;
      const debitMatch =
        parseAmount(entry.debit) > 0 && debitAccounts.includes(entry.account);
      const creditMatch =
        parseAmount(entry.credit) > 0 && creditAccounts.includes(entry.account);

      if (debitFilterOn || creditFilterOn) {
        if (debitFilterOn && creditFilterOn) {
          if (!debitMatch && !creditMatch) return false;
        } else if (debitFilterOn) {
          if (!debitMatch) return false;
        } else if (creditFilterOn) {
          if (!creditMatch) return false;
        }
      }

      return true;
    });
  }, [transactions, startDate, endDate, debitAccounts, creditAccounts]);

  const filteredDebitOptions = useMemo(() => {
    const keyword = debitSearch.trim().toLowerCase();
    if (!keyword) return accountOptions;
    return accountOptions.filter((name) => name.toLowerCase().includes(keyword));
  }, [accountOptions, debitSearch]);

  const filteredCreditOptions = useMemo(() => {
    const keyword = creditSearch.trim().toLowerCase();
    if (!keyword) return accountOptions;
    return accountOptions.filter((name) =>
      name.toLowerCase().includes(keyword)
    );
  }, [accountOptions, creditSearch]);

  const toggleAccount = (list, setList, name) => {
    if (list.includes(name)) {
      setList(list.filter((item) => item !== name));
    } else {
      setList([...list, name]);
    }
  };

  const hasAllSelected = (list, names) =>
    names.length > 0 && names.every((name) => list.includes(name));

  const toggleGroup = (list, setList, names) => {
    if (names.length === 0) return;
    if (hasAllSelected(list, names)) {
      setList(list.filter((item) => !names.includes(item)));
      return;
    }
    const merged = new Set(list);
    names.forEach((name) => merged.add(name));
    setList(Array.from(merged));
  };

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

  const handleExport = useCallback(() => {
    const header = [
      "id",
      "quarter",
      "month",
      "date",
      "description",
      "note",
      "account",
      "debit",
      "credit",
    ];
    const rows = filteredTransactions.map((entry) => [
      entry.id,
      entry.quarter,
      entry.month,
      toDateOnly(entry.date),
      entry.description,
      entry.note,
      entry.account,
      parseAmount(entry.debit),
      parseAmount(entry.credit),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const labelStart = startDate || "all";
    const labelEnd = endDate || "all";
    link.href = url;
    link.download = `ledger_${labelStart}_${labelEnd}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredTransactions, startDate, endDate]);

  useEffect(() => {
    if (typeof onExport === "function") {
      onExport(() => handleExport);
    }
  }, [onExport, handleExport]);

  return (
    <div style={{ padding: "12px" }}>
      <div style={{ marginBottom: "12px" }}>
        <h2 style={{ margin: 0 }}>기간/계정별 차변·대변 합계</h2>
        <p style={{ margin: "6px 0 0", color: "#666" }}>
          기간과 계정을 선택하면 해당 기간의 계정별 합계를 확인할 수
          있습니다.
        </p>
      </div>

      <div className="chart-filter-grid">
        <label>
          시작일
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: "100%", padding: "8px", marginTop: "8px" }}
          />
        </label>
        <label>
          종료일
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: "100%", padding: "8px", marginTop: "8px" }}
          />
        </label>
        <div>
          <div style={{ marginBottom: "6px", fontWeight: "bold" }}>
            차변 계정 선택
          </div>
          <input
            type="text"
            value={debitSearch}
            onChange={(e) => setDebitSearch(e.target.value)}
            placeholder="검색"
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`quick-btn ${
                hasAllSelected(debitAccounts, accountOptions) ? "active" : ""
              }`}
              onClick={() =>
                toggleGroup(debitAccounts, setDebitAccounts, accountOptions)
              }
            >
              전체
            </button>
            <button
              type="button"
              className={`quick-btn ${
                debitAccounts.length === 0 ? "active" : ""
              }`}
              onClick={() => setDebitAccounts([])}
            >
              해제
            </button>
            <button
              type="button"
              className={`quick-btn ${
                hasAllSelected(debitAccounts, incomeAccounts) ? "active" : ""
              }`}
              onClick={() =>
                toggleGroup(debitAccounts, setDebitAccounts, incomeAccounts)
              }
            >
              수입
            </button>
            <button
              type="button"
              className={`quick-btn ${
                hasAllSelected(debitAccounts, expenseAccounts) ? "active" : ""
              }`}
              onClick={() =>
                toggleGroup(debitAccounts, setDebitAccounts, expenseAccounts)
              }
            >
              경비
            </button>
            <button
              type="button"
              className={`quick-btn ${
                hasAllSelected(debitAccounts, vatAccounts) ? "active" : ""
              }`}
              onClick={() =>
                toggleGroup(debitAccounts, setDebitAccounts, vatAccounts)
              }
            >
              부가세
            </button>
          </div>
          <div
            style={{
              maxHeight: "240px",
              overflowY: "auto",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "10px",
              marginTop: "10px",
            }}
          >
            {filteredDebitOptions.map((account) => (
              <label
                key={`debit-${account}`}
                style={{ display: "block", marginBottom: "6px" }}
              >
                <input
                  type="checkbox"
                  checked={debitAccounts.includes(account)}
                  onChange={() =>
                    toggleAccount(debitAccounts, setDebitAccounts, account)
                  }
                />{" "}
                {account}
              </label>
            ))}
          </div>
        </div>
        <div>
          <div style={{ marginBottom: "6px", fontWeight: "bold" }}>
            대변 계정 선택
          </div>
          <input
            type="text"
            value={creditSearch}
            onChange={(e) => setCreditSearch(e.target.value)}
            placeholder="검색"
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`quick-btn ${
                hasAllSelected(creditAccounts, accountOptions) ? "active" : ""
              }`}
              onClick={() =>
                toggleGroup(creditAccounts, setCreditAccounts, accountOptions)
              }
            >
              전체
            </button>
            <button
              type="button"
              className={`quick-btn ${
                creditAccounts.length === 0 ? "active" : ""
              }`}
              onClick={() => setCreditAccounts([])}
            >
              해제
            </button>
            <button
              type="button"
              className={`quick-btn ${
                hasAllSelected(creditAccounts, incomeAccounts) ? "active" : ""
              }`}
              onClick={() =>
                toggleGroup(creditAccounts, setCreditAccounts, incomeAccounts)
              }
            >
              수입
            </button>
            <button
              type="button"
              className={`quick-btn ${
                hasAllSelected(creditAccounts, expenseAccounts) ? "active" : ""
              }`}
              onClick={() =>
                toggleGroup(creditAccounts, setCreditAccounts, expenseAccounts)
              }
            >
              경비
            </button>
            <button
              type="button"
              className={`quick-btn ${
                hasAllSelected(creditAccounts, vatAccounts) ? "active" : ""
              }`}
              onClick={() =>
                toggleGroup(creditAccounts, setCreditAccounts, vatAccounts)
              }
            >
              부가세
            </button>
          </div>
          <div
            style={{
              maxHeight: "240px",
              overflowY: "auto",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "10px",
              marginTop: "10px",
            }}
          >
            {filteredCreditOptions.map((account) => (
              <label
                key={`credit-${account}`}
                style={{ display: "block", marginBottom: "6px" }}
              >
                <input
                  type="checkbox"
                  checked={creditAccounts.includes(account)}
                  onChange={() =>
                    toggleAccount(creditAccounts, setCreditAccounts, account)
                  }
                />{" "}
                {account}
              </label>
            ))}
          </div>
        </div>
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
                <th style={{ textAlign: "right", padding: "8px" }}>
                  대변-차변
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
                  <td
                    style={{
                      padding: "8px",
                      textAlign: "right",
                      borderBottom: "1px solid #eee",
                      color: row.credit - row.debit >= 0 ? "limegreen" : "tomato",
                    }}
                  >
                    {(row.credit - row.debit).toLocaleString()}
                  </td>
                </tr>
              ))}
              {accountSummary.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "12px", color: "#666" }}>
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
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    {(totals.credit - totals.debit).toLocaleString()}
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
