import { UserButton } from "@clerk/nextjs";
import React from "react";

function page() {
  return (
    <>
      <div>Events</div>
      <UserButton />
    </>
  );
}

export default page;
