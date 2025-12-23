import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const SharedFiles = () => {
  const { friendId, folderId } = useParams();
  const [sharedFiles, setSharedFiles] = useState([]);
  useEffect(() => {
    fetchSharedFiles();
  }, []);

  const fetchSharedFiles = async () => {
    try {
      const res = await axios.get(
        `http://localhost:4000/api/folders/files/shared/${friendId}/${folderId}`,
        { withCredentials: true }
      );
      setSharedFiles(res.data.sharedFiles);
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <div>
      <h1>Files</h1>
      <p>{friendId}</p>
      <p>{folderId}</p>
      {sharedFiles.map((eachFile) => (
        <li key={eachFile.id}>{eachFile.filename}</li>
      ))}
    </div>
  );
};

export default SharedFiles;
