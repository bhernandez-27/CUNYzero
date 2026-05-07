"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SessionUser, UserRole } from "./session";

type RoleContextValue = {
  role: UserRole;
  name: string;
  id: string;
};

const RoleContext = createContext<RoleContextValue>({
  role: "student",
  name: "User",
  id: "",
});

export function RoleProvider({
  children,
  user,
}: {
  children: ReactNode;
  user: SessionUser;
}) {
  return (
    <RoleContext.Provider value={user}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  return useContext(RoleContext);
}
