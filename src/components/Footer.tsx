"use client";

import React from "react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-auto">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-deep-sea/5 to-deep-sea/15"></div>
      
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 flex flex-col items-center gap-6">
          {/* Logo/Brand */}
          <div>
            <div className="font-poppins font-bold text-xl bg-gradient-to-r from-dark-royalty to-deep-sea bg-clip-text text-transparent">
              Juvo Solutions
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center justify-center space-x-6">
            <a 
              href="https://juvosolutions.co" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-deep-sea hover:text-kimchi font-poppins text-sm transition-colors duration-300"
            >
              Visit Website
            </a>
            <span className="text-deep-sea/20">|</span>
            <a 
              href="/privacy" 
              className="text-deep-sea hover:text-kimchi font-poppins text-sm transition-colors duration-300"
            >
              Privacy Policy
            </a>
          </div>

          {/* Copyright */}
          <div className="text-deep-sea/60 font-poppins text-sm">
            © {currentYear} Juvo Solutions
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
