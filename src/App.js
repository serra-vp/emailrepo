import React from "react";
import { Button } from "@material-ui/core";
import axios from "axios";

const redirect = () => {
  axios({
    method: "get",
    url: "http://localhost:3001/permission"
  })
    .then(response => {
      window.open(
        response.data,
        "Request Permission",
        "width=1000, height=700, left=500, top=170"
      );
    })
    .catch(error => {
      console.error(error);
    });
};

function App() {
  return (
    <Button onClick={redirect} variant="contained" color="primary">
      Auth
    </Button>
  );
}

export default App;
