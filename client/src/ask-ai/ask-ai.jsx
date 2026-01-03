import axios from "axios";
import React from "react";
import { useState } from "react";

const AskAi = () => {
  const base_url = import.meta.env.VITE_API_BASE_URL;

  const [query, setQuery] = useState("");
  const [toggle, setToggle] = useState(false);

  const fetchResult = async () => {
    try {
      const res = await axios.get(`${base_url}/ai-query-response`, {
        params: { q: query },
        withCredentials: true,
      });

      alert(res.data.answer);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div>
      <button onClick={() => setToggle(!toggle)}>Ask</button>
      {toggle && (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ask query..."
          />
          <button onClick={fetchResult}>submit</button>
        </>
      )}
    </div>
  );
};

export default AskAi;
