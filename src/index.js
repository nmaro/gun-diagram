import React from "react";
import ReactDOM from "react-dom";
import App from "./app";
import "./style.css";

var mountNode = document.getElementById("app");
ReactDOM.render(<App name="GUN Poll" />, mountNode);
