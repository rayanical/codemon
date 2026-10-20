import ReactDOM from "react-dom/client";
import { PythonProvider } from "react-py";
import App from "./App";
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <PythonProvider autoImportPackages={false}>
    <App />
  </PythonProvider>,
);
