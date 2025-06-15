MODULE TestModule;

IMPORT Out, In, Strings;

CONST
    MaxSize = 100;
    PI* = 3.14159;
    Version = "1.0";

TYPE
    Point* = RECORD x*, y*: REAL END;
    Vector = ARRAY MaxSize OF Point;
    TreeNode* = POINTER TO Node;
    Node = RECORD
        data: INTEGER;
        left, right: TreeNode
    END;

VAR
    globalVar*: INTEGER;
    points: Vector;
    root: TreeNode;

PROCEDURE Init*();
BEGIN
    globalVar := 0;
    root := NIL
END Init;

PROCEDURE Add*(x, y: REAL): Point;
VAR p: Point;
BEGIN
    p.x := x;
    p.y := y;
    RETURN p
END Add;

PROCEDURE PrintPoint*(p: Point);
BEGIN
    Out.Real(p.x, 10);
    Out.String(", ");
    Out.Real(p.y, 10);
    Out.Ln
END PrintPoint;

PROCEDURE NestedExample();
    
    PROCEDURE InnerProc(n: INTEGER);
    BEGIN
        Out.Int(n, 0)
    END InnerProc;
    
BEGIN
    InnerProc(42)
END NestedExample;

BEGIN
    Init();
    Out.String("TestModule initialized");
    Out.Ln
END TestModule.
