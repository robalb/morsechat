package a

import "fmt"

type Validator struct{}

func (v Validator) RespondError() {
	fmt.Println("Error occurred")
}

var validator Validator

func validFunction() {
	validator.RespondError()
	return

	if true {
		validator.RespondError()
		return
	}
}

func invalidFunction() { // want "validator.RespondError() must be followed by a return statement"
	validator.RespondError()
	fmt.Println("This should not be printed")

	if true {
		validator.RespondError() // want "validator.RespondError() must be followed by a return statement"
	}
}

func switchCaseValid() {
	switch 1 {
	case 1:
		validator.RespondError()
		return
	}
}

func switchCaseInvalid() { // want "validator.RespondError() must be followed by a return statement"
	switch 1 {
	case 1:
		validator.RespondError()
	}
}

func selectCaseValid() {
	ch := make(chan int)
	select {
	case <-ch:
		validator.RespondError()
		return
	}
}

func selectCaseInvalid() { // want "validator.RespondError() must be followed by a return statement"
	ch := make(chan int)
	select {
	case <-ch:
		validator.RespondError()
	}
}
