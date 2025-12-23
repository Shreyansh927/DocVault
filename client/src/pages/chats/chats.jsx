import React, { useState } from "react";
import Header from "../../components/header/header";
import { useParams } from "react-router-dom";

const Chats = () => {
  const { friendId, friendName } = useParams();
  return (
    <div>
      <Header />
      <h1>chats</h1>
      <p>{friendId}</p>
      <p>{friendName}</p>
    </div>
  );
};

export default Chats;
