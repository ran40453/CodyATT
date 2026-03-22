# CodyATT UI 優化分析報告

> 分析日期：2026-03-22
> 涵蓋：CalendarPage 動畫、DayCard Bug、Info & Notes UI/編輯功能

---

## 一、Calendar 頁動畫流暢度問題

### 🔴 Bug 1：換月時畫面閃爍（isNeighborsLoaded 機制）

**位置：** `CalendarPage.jsx` 第 20-26 行

```jsx
const [isNeighborsLoaded, setIsNeighborsLoaded] = useState(false)

useEffect(() => {
    const timer = setTimeout(() => setIsNeighborsLoaded(true), 300);
    return () => clearTimeout(timer);
}, [currentDate]);  // ← 每次 currentDate 改變就重置
```

**問題：**
每次月份切換時，`isNeighborsLoaded` 先被設為 `false`，導致左右兩側 prev/next 月的 CalendarMonthGrid 立即被替換成空的 `<div className="h-[600px] w-full" />`，造成可見的**佈局高度跳動**與 300ms 的**白色閃爍**。
滑動動畫完成後才把相鄰月重新顯示出來，但此時用戶已經看到空白區塊。

**根本原因：**
本意是「延遲載入相鄰月以提升初始渲染效能」，但 deps 放了 `[currentDate]`，讓這個機制在每次滑動都會重新觸發，反而傷害動畫流暢度。

**建議修法：**
- 只在初始掛載時使用這個延遲（deps 改為 `[]`）
- 或直接移除此機制，讓三個月的格子都常駐渲染，換月後只更新資料

---

### 🔴 Bug 2：換月後 x 座標瞬間 set（無動畫過渡）

**位置：** `CalendarPage.jsx` 第 78-82 行

```jsx
useEffect(() => {
    if (containerWidth > 0) {
        x.set(-containerWidth);  // ← 直接 set，不是 animate
    }
}, [containerWidth, currentDate]);  // ← currentDate 改變時觸發
```

**問題：**
`handleDragEnd` 的 `animate(x, targetX, { type: "spring" })` 執行完後，`onComplete` 觸發 `setCurrentDate()`。
`currentDate` 更新 → 觸發此 useEffect → `x.set(-containerWidth)` **立即跳回中間位置**（無動畫）。
這會造成：spring 動畫結束後有一個**瞬間位移閃爍**。

**建議修法：**
`onComplete` 裡面先更新 currentDate，再用 `requestAnimationFrame` 延一幀才 `x.set(-containerWidth)`，或改用旗標避免 useEffect 觸發。

---

### 🟡 Bug 3：初始渲染 containerWidth = 0 造成三欄寬度為 0

**位置：** `CalendarPage.jsx` 第 63、207-229 行

```jsx
const [containerWidth, setContainerWidth] = useState(0)  // 初始為 0

// motion.div 的子欄位
<div style={{ width: containerWidth }} className="shrink-0 px-4">
```

**問題：**
首次渲染時 `containerWidth = 0`，三個月的欄位 width 都是 0，導致初始畫面短暫顯示空白，等到 `useEffect` 測量到真實寬度後才正確顯示。尤其在低速裝置上更明顯。

**建議修法：**
- 改用 CSS `calc(33.33%)` 取代像素寬度
- 或加 `visibility: containerWidth > 0 ? 'visible' : 'hidden'`

---

### 🟡 Bug 4：drag 缺少 `dragElastic` 與 `dragMomentum` 設定

**位置：** `CalendarPage.jsx` 第 205-212 行

```jsx
<motion.div
    drag="x"
    dragConstraints={{ left: -containerWidth * 2, right: 0 }}
    // ← 沒有設定 dragElastic 與 dragMomentum
    onDragEnd={handleDragEnd}
>
```

**問題：**
- `dragElastic` 預設值 `0.5`：在邊界外會有「橡皮筋」彈跳效果，但這裡超過邊界代表誤操作，彈跳感不自然
- `dragMomentum` 預設值 `true`：手放開後會繼續滑動，與 `onDragEnd` 的 spring 動畫疊加，可能出現**兩個動畫同時競爭**導致位置錯誤

**建議修法：**
```jsx
dragElastic={0.1}
dragMomentum={false}
```

---

### 🟡 Bug 5：modalTop 只監聽 resize，不監聽 scroll

**位置：** `CalendarPage.jsx` 第 65-76 行

```jsx
useEffect(() => {
    const updatePos = () => {
        if (bannerRef.current) {
            const rect = bannerRef.current.getBoundingClientRect();
            setModalTop(`${rect.bottom}px`);
        }
    };
    updatePos();
    window.addEventListener('resize', updatePos);
    // ← 沒有 scroll 監聽
    return () => window.removeEventListener('resize', updatePos);
}, []);
```

**問題：**
CalendarOverlay 使用 `position: fixed` + `top: modalTop`。
若用戶在行動裝置上滑動頁面後（或 iOS 軟鍵盤收起改變視窗高度），`modalTop` 不更新，Modal 會出現在錯誤位置。

**建議修法：**
加入 `window.addEventListener('scroll', updatePos)` 或在 Modal 開啟時重新計算一次。

---

## 二、DayCard Bug 問題

### 🔴 Bug 6：OT 顯示門檻不一致（DayCard vs DayCardExpanded）

**位置：** `DayCard.jsx` 第 112 行 vs `DayCardExpanded.jsx` 第 493 行

```jsx
// DayCard.jsx - 大於 0 就顯示
{otHours > 0 && (
    <span>{otHours.toFixed(1)}</span>
)}

// DayCardExpanded.jsx - 需要大於等於 0.5 才算加班
{otHours >= 0.5 ? (
    // 顯示加班資訊
) : (
    <span>時數不足 0.5H 不計入加班</span>
)}
```

**問題：**
DayCard 在格子裡顯示 `0.1`、`0.3` 等小數加班時數，但 DayCardExpanded 說明這些不計入加班。
造成用戶困惑：格子顯示有加班，點進去卻說「時數不足」。

**建議修法：**
DayCard 也改用 `otHours >= 0.5` 作為顯示門檻：

```jsx
{otHours >= 0.5 && (  // ← 從 > 0 改為 >= 0.5
    ...
)}
```

---

### 🔴 Bug 7：`isHoliday` 在 DayCard 被計算兩次

**位置：** `DayCard.jsx` 第 18 行與第 75、149 行

```jsx
// 第 18 行：已合併 isHoliday
const isHoliday = record?.isHoliday || isTaiwanHoliday(day);

// 第 75 行：又再次呼叫 isTaiwanHoliday(day)
isToday(day) ? "text-neumo-brand" : ((isHoliday || isTaiwanHoliday(day)) ? "text-rose-600" : ...)

// 第 149 行：又再次呼叫
{(isHoliday || isTaiwanHoliday(day)) && getHolidayName(day) && (
```

**問題：**
`isTaiwanHoliday()` 每次呼叫都要查詢假日資料庫，每個 DayCard 在渲染時呼叫了 3 次。日曆一個月有 35-42 個格子，共執行 **105-126 次**重複計算。

**建議修法：**
直接使用第 18 行已算好的 `isHoliday` 變數，移除後續兩處的 `isTaiwanHoliday(day)` 重複呼叫。

---

### 🔴 Bug 8：`layout` prop 造成效能問題

**位置：** `DayCard.jsx` 第 57-58 行

```jsx
<motion.div
    layout        // ← 每次父層重渲染都觸發 layout 測量
    onClick={() => onClick && onClick(day)}
    whileHover={{ backgroundColor: "#f3e8ff", scale: 0.98 }}
```

**問題：**
`layout` 告訴 Framer Motion 在此元素尺寸或位置改變時做動畫。但 DayCard 的尺寸固定不變，使用 `layout` 只會讓 Framer Motion 在**每次重渲染時都測量 DOM 尺寸**（`getBoundingClientRect`），造成不必要的 layout thrashing。
日曆有 35+ 個 DayCard，加上已有 `React.memo` 防護，`layout` prop 弊大於利。

**建議修法：**
移除 `layout` prop，改用純 CSS transition 處理需要的視覺效果。

---

### 🟡 Bug 9：React.memo 的 custom equality 未涵蓋請假相關欄位

**位置：** `DayCard.jsx` 第 168-193 行

```jsx
export default React.memo(DayCard, (prevProps, nextProps) => {
    const recordChanged =
        r1?.date !== r2?.date ||
        r1?.endTime !== r2?.endTime ||
        r1?.isLeave !== r2?.isLeave ||
        // ... 沒有檢查：
        // r1?.leaveDuration !== r2?.leaveDuration  ← 缺漏
        // r1?.leaveType !== r2?.leaveType          ← 缺漏
        // r1?.leaveStartTime !== r2?.leaveStartTime ← 缺漏
```

**問題：**
如果用戶修改了「請假時數」、「假別」或「請假時間段」，DayCard 不會重新渲染，因為這些欄位沒有被納入比較。
實際上 `calculateDailySalary()` 有用到這些值計算扣薪，DayCard 上的金額顯示可能過時。

**建議修法：**
在 `recordChanged` 中加入：
```jsx
r1?.leaveDuration !== r2?.leaveDuration ||
r1?.leaveType !== r2?.leaveType ||
r1?.leaveStartTime !== r2?.leaveStartTime ||
r1?.leaveEndTime !== r2?.leaveEndTime ||
```

---

### 🟡 Bug 10：`isAutoFilled` 自動填入紀錄的 `isWorkDay: true` 邏輯問題

**位置：** `CalendarMonthGrid.jsx` 第 43-54 行

```jsx
if (isPastOrToday && isWeekday && !isHoliday) {
    return {
        date: dayStr,
        isHoliday: false,
        isAutoFilled: true,
        startTime: '08:30',
        endTime: '17:30',
        isWorkDay: true  // ← 設為 true
    }
}
```

**問題：**
自動填入的工作日設了 `isWorkDay: true`，這個旗標原本是用來標記「假日出勤（Rest Day 當 Weekday 算）」。
用在普通工作日反而讓 `isRestDay` 的計算邏輯混淆。雖然目前因為 endTime 等於 standardEndTime 所以 OT = 0 而無影響，但語意錯誤可能在未來功能擴展時造成 bug。

**建議修法：**
自動填入的工作日不需要 `isWorkDay: true`，應移除或改為 `isWorkDay: false`。普通平日不需此旗標。

---

### 🟡 Bug 11：`DayCardExpanded` record 同步 useEffect 沒有同步 `leaveType` 等請假狀態

**位置：** `DayCardExpanded.jsx` 第 62-79 行

```jsx
useEffect(() => {
    if (record) {
        setEndTime(rawTime)
        setTravelCountry(country)
        setIsHoliday(record.isHoliday || false)
        setIsWorkDay(record.isWorkDay || false)
        setIsLeave(record.isLeave || false)
        setOtType(record.otType || 'pay')
        setRemarks(record.remarks || '')
        setBonus(record.bonus || 0)
        // ← 缺漏：leaveType, leaveDuration, isFullDay, leaveStartTime, leaveEndTime
    }
}, [record?.date, record?.endTime, ...]
```

**問題：**
當 record prop 更新時（例如 parent 重新 fetch 資料），`leaveType`、`leaveDuration` 等狀態不會同步更新，UI 會顯示舊值。
特別是在快速連續切換不同日期的情況下，前一天的請假類型可能殘留。

---

## 三、Info & Notes UI 與編輯功能問題

### 🔴 Bug 12：Markdown → HTML 雙重轉換（儲存後格式損壞）

**位置：** `InfoPage.jsx` 第 82-88 行（handleFileSelect）

```jsx
const handleFileSelect = (file) => {
    setSelectedFile(file)
    const cleanHtmlOrMarkdown = marked.parse(file.content || '')  // Markdown → HTML
    setEditContent(cleanHtmlOrMarkdown)
    // ...
}
```

**問題（嚴重）：**
1. **首次開啟**：`file.content` 是 Markdown → `marked.parse()` 轉成 HTML → 存入 `editContent` → SunEditor 顯示 HTML ✓
2. **儲存後**：`handleSave` 把 `editContent`（HTML）直接寫回 Gist
3. **再次開啟**：`file.content` 現在是 HTML → `marked.parse(htmlContent)` 把 `<h1>`、`<p>` 等 HTML 標籤當作 Markdown 文字處理 → **內容損壞或顯示為純文字 HTML 標籤**

這是一個**破壞性 bug**，編輯並儲存一次後，再開啟檔案就會看到原始 HTML 標籤。

**建議修法：**
- 儲存時將 HTML 轉回 Markdown（使用 `turndown` library）
- 或統一改為純 HTML 儲存，取消 `marked.parse()` 這個轉換步驟
- 或在 `handleFileSelect` 判斷 `file.content` 是否已經是 HTML（以 `<` 開頭）來避免重複解析

---

### 🔴 Bug 13：複製功能複製的是舊內容

**位置：** `InfoPage.jsx` 第 168-174 行

```jsx
const handleCopy = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content || editContent)
    //                            ↑ 優先用 selectedFile.content（儲存前的舊值）
}
```

**問題：**
用戶編輯了內容但尚未儲存時，點複製會複製**舊版內容**而非當前編輯中的內容。
`selectedFile.content` 在儲存前仍是原始值，`editContent` 才是即時編輯狀態。

**建議修法：**
```jsx
navigator.clipboard.writeText(isEditing ? editContent : (selectedFile.content || editContent))
```

---

### 🟡 Bug 14：切換檔案時 SunEditor 內容未重置

**位置：** `InfoPage.jsx` handleFileSelect 函數

**問題：**
切換到另一個檔案時，`setEditContent(newContent)` 更新了 state，但 SunEditor 是受控/非受控混合元件，光更新 `editContent` state 不一定能讓編輯器顯示新內容。
特別是當 `isEditing` 為 `true` 時切換檔案，SunEditor 可能顯示前一個檔案的內容。

**建議修法：**
使用 `editorRef.current?.setContents(newContent)` 強制更新編輯器內容，或在切換時先 `setIsEditing(false)` 再用 key prop 重新掛載 SunEditor：
```jsx
<SunEditor key={selectedFile?.filename} ... />
```

---

### 🟡 Bug 15：行動版面板切換使用 CSS translate 而非 AnimatePresence

**位置：** `InfoPage.jsx` 第 457-462 行

```jsx
<motion.div
    className={cn(
        "...",
        isMobileListVisible ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        // ↑ 用 Tailwind class 切換，非 Framer Motion 動畫
    )}
>
```

**問題：**
雖然這個 div 是 `motion.div`，但過場效果靠的是 Tailwind CSS class 切換（`transition-all duration-300`），而非 Framer Motion 的動畫系統。
這導致：
- 無法用 `AnimatePresence` 的 exit 動畫
- 動畫速度與其他 Framer Motion 元件不一致
- 在某些瀏覽器上 CSS transform 與 Framer Motion 的 `x` 屬性衝突

**建議修法：**
改用 Framer Motion 的 `animate` prop：
```jsx
<motion.div
    animate={{ x: isMobileListVisible ? 0 : "-100%" }}
    transition={{ type: "spring", stiffness: 300, damping: 30 }}
>
```

---

### 🟡 Bug 16：新建檔案時未實際寫入 Gist

**位置：** `InfoPage.jsx` 第 176-197 行

```jsx
const handleCreateNewFile = () => {
    const dummyName = `Untitled_${Math.floor(Math.random() * 10000)}`;
    const newFile = { filename: `${dummyName}.md`, content: '' };

    setFiles(prev => [...prev, newFile]);  // 只更新 local state
    setSelectedFile(newFile);
    setIsEditing(true);
    // ← 沒有呼叫 updateGistFile() 寫入 Gist
}
```

**問題：**
新建檔案只加入本地 `files` state，並未呼叫 `updateGistFile()` 寫入 Gist。
如果用戶建立檔案後直接切換 tab（未儲存），或 Gist 同步失敗，這個「新檔案」就憑空消失。
下次 `load()` 重新 fetch Gist 時，這個未儲存的 Untitled 檔案也不存在。

**建議修法：**
在 `handleCreateNewFile` 裡加入 `await updateGistFile(...)` 呼叫，立即在 Gist 建立空檔案。

---

### 🟢 UI 優化建議（非 Bug）

**17. 編輯模式下缺少字數/修改提示**
進入編輯模式後，沒有視覺提示告知用戶「有未儲存的變更」。建議加入 dirty state 指示器（例如標題旁的橘點）。

**18. 假別選擇器（isLeaveTypePickerOpen）遮蓋下方內容**
`z-[60]` 的選單在小螢幕上可能超出 modal 邊界，建議改用底部 sheet 取代 dropdown。

**19. DayCard 在 mobile 上 `h-20`（80px）顯示資訊密度不足**
當有 OT + 國旗 + 金額同時存在時，mobile 的 80px 高度會擠壓，建議動態調整高度或使用 tooltip。

**20. Info & Notes 的 Markdown 預覽無法處理 `@@` 快捷符號**
`marked.parse()` 不支援自訂語法，如果文檔中有 `@@` 記法，需要在 parse 前先做文字替換。

---

## 優先修復排序

| 優先級 | Bug # | 問題 | 影響 |
|--------|-------|------|------|
| P0（立刻修） | #12 | Markdown 雙重轉換破壞內容 | 資料損壞 |
| P0（立刻修） | #1 | 換月時畫面閃爍 | 核心體驗 |
| P0（立刻修） | #6 | OT 顯示門檻不一致 | 功能錯誤 |
| P1 | #2 | 換月後 x 座標跳位 | 動畫閃爍 |
| P1 | #9 | memo 未涵蓋請假欄位 | 顯示不更新 |
| P1 | #13 | 複製的是舊內容 | 功能錯誤 |
| P1 | #16 | 新建檔案未寫入 Gist | 資料遺失 |
| P2 | #3 | 初始 containerWidth=0 | 輕微閃爍 |
| P2 | #4 | drag 彈性/慣性設定 | 動畫手感 |
| P2 | #7 | isTaiwanHoliday 重複計算 | 效能 |
| P2 | #8 | layout prop 效能 | 效能 |
| P2 | #11 | DayCardExpanded 狀態未同步 | 偶發顯示問題 |
| P2 | #14 | SunEditor 內容未重置 | 偶發顯示問題 |
| P3 | #5 | modalTop 不監聽 scroll | 行動端邊緣 case |
| P3 | #10 | isWorkDay 語意錯誤 | 技術債 |
| P3 | #15 | 行動版面板動畫方式 | UI 一致性 |

