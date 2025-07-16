import React from 'react';
import Image from 'next/image';

const Header = () => {
  return (
    <header className="p-4">
      <div className="flex items-center bg-transparent">
        <Image src="/logo.png" alt="Logo" width={100} height={100} />
      </div>
    </header>
  );
};

export default Header;
