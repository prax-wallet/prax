import { Link } from 'react-router-dom';

export const Index = () => {
  return (
    <div className='bg-neutral-800 w-full min-h-screen flex flex-col gap-4 items-center justify-center'>
      <img src='./prax-white-vertical.svg' className='w-72 h-72' />
      <div className='relative inline-flex group -ml-4'>
        <div className='absolute transitiona-all duration-1000 opacity-70 -inset-px bg-gradient-to-r from-[#ff8f2f] via-[#c9b67c] to-[#8be4d9] rounded-xl blur-lg group-hover:opacity-100 group-hover:-inset-1 group-hover:duration-200 animate-tilt'></div>
        <a
          href='https://chromewebstore.google.com/detail/penumbra-wallet/lkpmkhpnhknhmibgnmmhdhgdilepfghe'
          title='Download the prax extension'
          className='relative inline-flex items-center justify-center px-7 py-3 text-lg font-bold text-white transition-all duration-200 bg-gray-900 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900'
          role='button'
        >
          Download
        </a>
      </div>
      <Link to='/privacy-policy' className='-ml-4 mt-10 text-neutral-600 italic underline'>
        Privacy Policy
      </Link>
    </div>
  );
};
