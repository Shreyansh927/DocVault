import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { useState } from "react";

const Room = () => {
  const { roomName, roomId } = useParams();
  const [allCurrentMembers, setAllCurrentMembers] = useState([]);
  const base_url = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    getAllCurrentMembers();
  }, []);

  async function getAllCurrentMembers() {
    try {
      const res = await axios.get(
        `${base_url}/api/room/get-current-room-members`,
        {
          params: { roomName, roomId },
          withCredentials: true,
        },
      );
      setAllCurrentMembers(res.data.allRoomMembers);
    } catch (e) {
      console.log(e.response.data.console.error);
      toast.error(e.response.data.console.error);
    }
  }

  return (
    <>
      <h1>ROOM IS READY!!</h1>
      <p>
        {roomName} && {roomId}
      </p>

      <ul>
        {allCurrentMembers.map((guest) => (
          <>
            <div key={guest.guestId}>
              <li>{guest.guestId}</li>
              <li>{guest.guestName}</li>
              <li>{guest.gueststatus}</li>
              <li>{guest.guestRole}</li>
            </div>
          </>
        ))}
      </ul>
    </>
  );
};

export default Room;
