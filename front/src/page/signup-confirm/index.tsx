import "./index.css";
import React, { useContext } from "react";

import BackBtn from "../../component/back-button";
import Field from "../../component/field";
import Title from "../../component/title";
import Button from "../../component/button";
import Alert from "../../component/alert";

import { useNavigate } from "react-router-dom";
import { saveSession } from "../../utils/session";

import { Form } from "../../utils/form";

import {
   stateServerReduser,
   requestInitialState,
   REQUEST_ACTION_TYPE,
} from "../../utils/serverReducer";
import { AuthContext } from "../../App";
import { Loader } from "../../component/sceleton";

class SignupConfirmForm extends Form {
   FIELD_NAME = {
      CODE: "code",
   };

   FIELD_ERROR = {
      IS_EMPTY: "Введіть значення в поле",
      IS_BIG: "Занадто довге значення. Пориберіть зайве",
   };

   validate = (name: string, value: any): string | undefined => {
      if (String(value).length < 1) {
         return this.FIELD_ERROR.IS_EMPTY;
      }
      if (String(value).length > 30) {
         return this.FIELD_ERROR.IS_BIG;
      }
   };
}
const signupConfirmForm = new SignupConfirmForm();
// ==================================
type InitialState = {
   code: null;
   errors: { code: "" };
};

type State = {
   code: number | null;
   errors: { code: string | undefined };
};

type Action = {
   type: ACTION_TYPE;
   payload?: any;
   error?: string | undefined;
};

enum ACTION_TYPE {
   CHANGE_CODE = "CHANGE_CODE",
   VALIDATE_ALL = "VALIDATE_ALL",
}

const stateReducer: React.Reducer<State, Action> = (
   state: State,
   action: Action
): State => {
   const value = action.payload;
   const error = action.error;
   const errors = state.errors;

   switch (action.type) {
      case ACTION_TYPE.CHANGE_CODE:
         signupConfirmForm.change("code", value);
         errors.code = error;
         return { ...state, code: value, errors: errors };

      case ACTION_TYPE.VALIDATE_ALL:
         return { ...state, errors: errors };
      default:
         return state;
   }
};

export default function Container() {
   const navigate = useNavigate();
   let userSession = useContext(AuthContext);
   // const session = getSession();

   const initState: InitialState = {
      code: null,
      errors: { code: "" },
   };

   const initializer = (state: InitialState): State => ({
      ...state,
      code: null,
      errors: { code: "" },
   });

   const [state, dispach] = React.useReducer(
      stateReducer,
      initState,
      initializer
   );

   const handleInput: React.ChangeEventHandler<HTMLInputElement> | undefined = (
      e
   ) => {
      // console.log(e.target.name, e.target.value);
      let error: string | undefined = signupConfirmForm.validate(
         e.target.name,
         e.target.value
      );
      // console.log(error);
      if (e.target.name === "code") {
         dispach({
            type: ACTION_TYPE.CHANGE_CODE,
            payload: e.target.value,
            error: error,
         });
      }
   };

   React.useEffect(() => {
      //console.log(state);
      signupConfirmForm.checkDisabled();
   }, [state]);

   const [stateServer, dispachServer] = React.useReducer(
      stateServerReduser,
      requestInitialState
   );

   // ==========

   const convertData = (data: { code: number }) => {
      return JSON.stringify({
         code: data.code,
         token: userSession.userState.token,
      });
   };
   const convertData1 = (data: { email: string }) => {
      return JSON.stringify({
         renew: true,
         email: userSession.userState.user.email,
      });
   };

   const sendData = async (dataToSend: { code: number }) => {
      dispachServer({ type: REQUEST_ACTION_TYPE.PROGRESS });

      try {
         const res = await fetch("http://localhost:4000/signup-confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: convertData(dataToSend),
         });

         const data = await res.json();

         if (res.ok) {
            saveSession(data.session);
            dispachServer({
               type: REQUEST_ACTION_TYPE.SUCCESS,
               message: "Акаунт підтверджено",
            });
            userSession.authDisp("LOGIN", data.session);
            navigate(`/balance`, { replace: true });
         } else {
            dispachServer({
               type: REQUEST_ACTION_TYPE.ERROR,
               message: data.message,
            });
            // userSession.authDisp("LOGOUT");
            console.log(data.message, "error");
         }
      } catch (error) {
         const message = "Не можливо підключитись";
         dispachServer({
            type: REQUEST_ACTION_TYPE.ERROR,
            message: message,
         });
         console.log("send-error");
      }
   };
   // ==============================

   const handleSubmit = () => {
      const code = state.code;
      // console.log(code != null);
      if (code != null && signupConfirmForm.validateAll()) {
         sendData({ code });
      } else {
         console.log("Data not sendet");
      }
   };
   const handleRenew = () => {
      const renew = true;
      const email = userSession.userState.user.email;
      if (typeof email === "string" && signupConfirmForm.validateAll()) {
         sendRequest({ renew, email });
      } else {
         console.error("data sending failed");
      }
   };
   // ====================================

   const sendRequest = async (dataToSend: {
      renew: boolean;
      email: string;
   }) => {
      dispachServer({ type: REQUEST_ACTION_TYPE.PROGRESS });

      try {
         const res = await fetch(`http://localhost:4000/signup-confirm/renew`, {
            method: "Post",
            headers: { "Content-Type": "application/json" },
            body: convertData1(dataToSend),
         });

         const data = await res.json();

         if (res.ok) {
            dispachServer({
               type: REQUEST_ACTION_TYPE.SUCCESS,
               message: "Код оновлено",
            });
         } else {
            dispachServer({
               type: REQUEST_ACTION_TYPE.ERROR,
               message: data.message,
            });
            console.log("error");
         }
      } catch (error) {
         const message = "Не можливо підключитись";
         dispachServer({
            type: REQUEST_ACTION_TYPE.ERROR,
            message: message,
         });
         console.log("send-error");
      }
   };

   return (
      <section className="form-section">
         <div style={{ padding: "10px 20px 22px" }}>
            <BackBtn />
         </div>

         {stateServer.status === REQUEST_ACTION_TYPE.PROGRESS && <Loader />}

         <div style={{ display: "grid", gap: "32px" }}>
            <Title
               title={"Confirm account"}
               text={"Write the code you received"}
            ></Title>

            <div className="form">
               <div className="form__item">
                  <Field
                     action={handleInput}
                     label="Code"
                     type="number"
                     name="code"
                     error={state.errors.code}
                     id={"field-0013"}
                  />
               </div>

               <span className="link__prefix">
                  Lost code?
                  <span onClick={handleRenew} className="link" id="renew">
                     Send again
                  </span>
               </span>

               <Button onClick={handleSubmit}>Continue</Button>

               {stateServer.status && (
                  <Alert
                     status={stateServer.status}
                     message={stateServer.message}
                  />
               )}
            </div>
         </div>
      </section>
   );
}
