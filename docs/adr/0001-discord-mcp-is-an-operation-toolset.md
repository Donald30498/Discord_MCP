# Discord MCP 只提供操作工具

此 MCP 將 Discord API 操作提供給外部 Agent 呼叫。它不自行判斷，也不加入業務規則、權限預檢、確認門檻或額外的操作限制；Agent 決定呼叫什麼，Discord 依自己的 API 權限與限制處理請求。這個邊界讓不同 Agent 能共用同一套工具，而各自保有自己的規則。

MCP 只處理執行呼叫及回傳結果所需的工作，包括將 Discord 的速率限制回應交給 Agent，而不自行決定何時重試。
