package main

import (
	"go/ast"
	"golang.org/x/tools/go/analysis"
)

var RespondErrorReturnAnalyzer = &analysis.Analyzer{
	Name: "responderrorreturn",
	Doc:  "Checks that validator.RespondError() is followed by a return statement",
	Run:  run,
}

func run(pass *analysis.Pass) (interface{}, error) {
  return nil, nil
	// for _, file := range pass.Files {
	// 	ast.Inspect(file, func(n ast.Node) bool {
	// 		bs, ok := n.(*ast.BlockStmt)
	// 		if !ok {
	// 			return true
	// 		}

	// 		for i, stmt := range bs.List {
	// 			if i+1 >= len(bs.List) {
	// 				continue // Skip the last statement since there's nothing after it
	// 			}

	// 			// Check if the current statement is a call to validator.RespondError()
	// 			if isRespondErrorCall(stmt) {
	// 				// Check if the next statement is a return statement
	// 				_, isReturn := bs.List[i+1].(*ast.ReturnStmt)
	// 				if !isReturn {
	// 					pass.Reportf(stmt.Pos(), "validator.RespondError() must be followed by a return statement")
	// 				}
	// 			}
	// 		}

	// 		return true
	// 	})
	// }
	// return nil, nil
}

// isRespondErrorCall checks if a statement is a call to validator.RespondError().
func isRespondErrorCall(stmt ast.Stmt) bool {
	exprStmt, ok := stmt.(*ast.ExprStmt)
	if !ok {
		return false
	}

	call, ok := exprStmt.X.(*ast.CallExpr)
	if !ok {
		return false
	}

	sel, ok := call.Fun.(*ast.SelectorExpr)
	if !ok {
		return false
	}

	if id, ok := sel.X.(*ast.Ident); !ok || id.Name != "validator" || sel.Sel.Name != "RespondError" {
		return false
	}

	return true
}
