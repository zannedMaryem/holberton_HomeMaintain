export function KitchenIllustration() {
  return (
    <svg
      className="kitchen-art"
      viewBox="0 0 640 520"
      role="img"
      aria-label="Illustration of a warm, well-kept kitchen"
    >
      <defs>
        <linearGradient id="room" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f4eee2" />
          <stop offset="1" stopColor="#dfe9dc" />
        </linearGradient>
        <linearGradient id="sunlight" x1="0" x2="1">
          <stop offset="0" stopColor="#fff8e9" stopOpacity=".95" />
          <stop offset="1" stopColor="#fff8e9" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="640" height="520" rx="28" fill="url(#room)" />
      <path d="M0 0h640v112H0z" fill="#e8eee4" />
      <path d="M34 32h197v182H34z" fill="#f9f5ec" />
      <path d="M48 46h169v152H48z" fill="#cfe0d8" />
      <path d="M132 46v152M48 122h169" stroke="#f8f6ef" strokeWidth="10" />
      <path d="M218 48 386 214H80z" fill="url(#sunlight)" opacity=".8" />
      <rect x="0" y="350" width="640" height="170" fill="#d9c6a9" />
      <rect x="25" y="239" width="590" height="124" rx="5" fill="#f6f3eb" />
      <path d="M25 354h590v18H25z" fill="#b89570" />
      <path d="M25 372h590v116H25z" fill="#e7dfd0" />
      <path d="M34 382h185v98H34zM228 382h186v98H228zM423 382h183v98H423z" fill="#f2ede3" />
      <path d="M126 382v98m195-98v98m194-98v98" stroke="#d7ccbb" strokeWidth="2" />
      <path d="M91 419h40m151 0h40m151 0h40" stroke="#b89975" strokeWidth="5" strokeLinecap="round" />
      <path d="M264 354v-23c0-22 16-39 37-39s37 17 37 39v23" fill="none" stroke="#697d70" strokeWidth="9" strokeLinecap="round" />
      <path d="M289 325h25" stroke="#697d70" strokeWidth="8" strokeLinecap="round" />
      <path d="M235 356h138c-7 32-28 48-69 48s-62-16-69-48Z" fill="#d7e3dd" stroke="#879b8c" strokeWidth="3" />
      <rect x="448" y="300" width="80" height="52" rx="8" fill="#f4efe4" />
      <path d="M459 300v-10a29 29 0 0 1 58 0v10" fill="none" stroke="#8c9a7c" strokeWidth="5" />
      <path d="M517 292c-2-42 22-67 52-78-2 37-19 64-52 78Z" fill="#6a8c68" />
      <path d="M515 300c-8-35-31-54-62-58 6 34 27 54 62 58Z" fill="#82a278" />
      <path d="M517 300v-64" stroke="#557653" strokeWidth="4" />
      <circle cx="430" cy="275" r="13" fill="#f4d492" />
      <circle cx="459" cy="265" r="8" fill="#e3b978" />
      <rect x="534" y="245" width="44" height="108" rx="8" fill="#f4f0e5" />
      <path d="M544 260h24m-24 18h24m-24 18h24" stroke="#d2c4ac" strokeWidth="3" strokeLinecap="round" />
      <rect x="28" y="486" width="584" height="10" rx="5" fill="#b89570" opacity=".55" />
    </svg>
  );
}

export function RepairIllustration() {
  return (
    <svg
      className="repair-art"
      viewBox="0 0 520 360"
      role="img"
      aria-label="Illustration of a sink repair in progress"
    >
      <rect width="520" height="360" rx="22" fill="#e8f0e8" />
      <rect x="36" y="35" width="448" height="174" rx="12" fill="#f8f5ed" />
      <path d="M70 80h178v102H70z" fill="#d4e4dc" />
      <path d="M159 80v102M70 131h178" stroke="#f8f5ed" strokeWidth="8" />
      <path d="M36 224h448v24H36z" fill="#b89570" />
      <path d="M60 252h400v78H60z" fill="#e3d9c9" />
      <path d="M174 248h169c-5 25-32 40-84 40s-80-15-85-40Z" fill="#d3e2dc" stroke="#718a7a" strokeWidth="4" />
      <path d="M219 248v-35a33 33 0 0 1 66 0v12" fill="none" stroke="#657a6d" strokeWidth="9" strokeLinecap="round" />
      <path d="M248 223h42" stroke="#657a6d" strokeWidth="8" strokeLinecap="round" />
      <path d="m109 292 57-58m-63 54 17 16m41-72 17 16" stroke="#32654c" strokeWidth="11" strokeLinecap="round" />
      <circle cx="392" cy="104" r="39" fill="#dce8da" />
      <path d="m372 104 14 14 28-31" fill="none" stroke="#32654c" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M84 330h351" stroke="#b89570" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
