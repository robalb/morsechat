package validation

import (
	"encoding/json"
	"errors"
	"net/http"
	"reflect"

	"github.com/go-playground/validator/v10"
)

// Bind function inspired by gin's Model Binding
// There is also this interesting project:
//   https://pkg.go.dev/gitea.com/go-chi/binding#section-readme
//   https://gitea.com/go-chi/binding/src/commit/39a851e106ed/binding.go#L170
func Bind(w http.ResponseWriter, r *http.Request, field interface{}) (err error) {
  err = ShouldBind(r, field)
  if err != nil{
    JSONError(w, "Validation failed", err.Error(), http.StatusBadRequest)
  }
  return
}


func ShouldBind(r *http.Request, field interface{}) (err error) {
  ensurePointer(field)
  if r.Body == nil {
		return errors.New("Empty body")
  }
	if err = json.NewDecoder(r.Body).Decode(field); err != nil {
		return err
	}
	validate := validator.New()
	if err = validate.Struct(field); err != nil {
		return err
	}
	return nil
}

func ensurePointer(obj interface{}) {
	if reflect.TypeOf(obj).Kind() != reflect.Ptr {
		panic("Pointers are only accepted as binding models")
	}
}

