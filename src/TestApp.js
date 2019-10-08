//This app demonstrates the difference between local, global state, and useRef hook variables!

import React, { useState, useRef } from 'react';

let globalCount = 0;
const TestApp = () => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  let localCount = 0;

  console.log('I am rendering', countRef, new Date());
  return (
    <>
      <button
        onClick={() => {
          setCount(count + 1);
          globalCount = globalCount + 1;
          localCount = localCount + 1;
          countRef.current = countRef.current + 1; // You need to access the "current" property.
        }}
      >
        Increment
      </button>
      <p>The state count is {count}</p>
      <p>The global count is {globalCount}</p>
      <p>The local count is {localCount}</p>
      <p>The local ref count is {countRef.current}</p>
    </>
  );
};

export default TestApp;
