graph TB
    subgraph "Browser 1 - User A"
        A1[React App]
        A2[Canvas Component]
        A3[Rectangle Components]
        A4[Cursor Components]
        A5[AuthContext]
        A6[CanvasContext]
        A7[useCanvas Hook]
        A8[useCursors Hook]
        A9[canvasService]
        A10[cursorService]
        A11[firebaseService]
        
        A1 --> A5
        A1 --> A6
        A2 --> A7
        A2 --> A8
        A2 --> A3
        A2 --> A4
        A7 --> A6
        A8 --> A10
        A6 --> A9
        A9 --> A11
        A10 --> A11
    end
    
    subgraph "Browser 2 - User B"
        B1[React App]
        B2[Canvas Component]
        B3[Rectangle Components]
        B4[Cursor Components]
        B5[AuthContext]
        B6[CanvasContext]
        B7[useCanvas Hook]
        B8[useCursors Hook]
        B9[canvasService]
        B10[cursorService]
        B11[firebaseService]
        
        B1 --> B5
        B1 --> B6
        B2 --> B7
        B2 --> B8
        B2 --> B3
        B2 --> B4
        B7 --> B6
        B8 --> B10
        B6 --> B9
        B9 --> B11
        B10 --> B11
    end
    
    subgraph "Firebase Backend"
        FB[(Firebase Realtime Database)]
        FA[Firebase Auth]
        FH[Firebase Hosting]
        
        subgraph "Database Structure"
            DB1[/users/]
            DB2[/cursors/]
            DB3[/rectangles/]
        end
        
        FB --> DB1
        FB --> DB2
        FB --> DB3
    end
    
    subgraph "Development Tools"
        V[Vite Dev Server]
        K[Konva.js Canvas Library]
        T[Vitest Test Runner]
        
        T1[canvasService.test.js]
        T2[cursorService.test.js]
        T3[canvasHelpers.test.js]
        
        T --> T1
        T --> T2
        T --> T3
    end
    
    A11 <-->|"WebSocket Connection<br/>Real-time Sync"| FB
    B11 <-->|"WebSocket Connection<br/>Real-time Sync"| FB
    
    A5 -->|Anonymous Auth| FA
    B5 -->|Anonymous Auth| FA
    
    A2 -.->|Renders with| K
    B2 -.->|Renders with| K
    
    V -.->|Serves| A1
    V -.->|Serves| B1
    
    FH -.->|Hosts Production Build| A1
    FH -.->|Hosts Production Build| B1
    
    style A1 fill:#e1f5ff
    style B1 fill:#ffe1f5
    style FB fill:#ffecb3
    style FA fill:#ffecb3
    style FH fill:#ffecb3
    style V fill:#e8f5e9
    style K fill:#e8f5e9
    style T fill:#e8f5e9