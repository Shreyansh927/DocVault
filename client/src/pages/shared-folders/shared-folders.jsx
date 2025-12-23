import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const SharedFolders = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [allSharedFolders, setAllSharedFolders] = useState([]);
  useEffect(() => {
    fetchSharedFolders();
  });

  useEffect(() => {
    fetchSharedFolders();
  }, [userId]);

  const fetchSharedFolders = async () => {
    try {
      const res = await axios.get(
        `http://localhost:4000/api/folders/shared/${userId}`,
        { withCredentials: true }
      );
      setAllSharedFolders(res.data.sharedFolders);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div>
      <h1>shared-folders</h1>
      <p>{userId}</p>
      {allSharedFolders.map((eachFolder) => (
        <li
          onClick={() =>
            navigate(`/folder/files/shared/${userId}/${eachFolder.id}`)
          }
          key={eachFolder.id}
        >
          {eachFolder.folder_name}
        </li>
      ))}
    </div>
  );
};

export default SharedFolders;
