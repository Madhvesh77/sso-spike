import React from "react";
import type { User } from "../utils/types";

interface UserInfoProps {
  user: User;
}

export const UserInfo: React.FC<UserInfoProps> = ({ user }) => {
  return (
    <div className="space-y-2" data-testid="user-info">
      <div>
        <span className="font-semibold">Name:</span> {user.name}
      </div>
      <div>
        <span className="font-semibold">Email:</span> {user.email}
      </div>
      <div>
        <span className="font-semibold">Roles:</span>
        <ul className="list-disc list-inside">
          {user.roles.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
