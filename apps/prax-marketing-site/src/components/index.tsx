import { Link } from 'react-router-dom';

export const Index = () => {
  return (
    <div className='flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-neutral-800'>
      <img src='./prax-white-vertical.svg' className='size-72' />
      <div className='group relative -ml-4 mb-2 inline-flex'>
        <div className='text-3xl font-bold text-white'>
          <div>Personal.</div>
          <div>Private.</div>
          <div>Practical.</div>
        </div>
      </div>
      <div className='group relative my-8 -ml-4 inline-flex'>
        <div className='absolute -inset-px rounded-xl bg-gradient-to-r from-[#ff8f2f] via-[#c9b67c] to-[#8be4d9] opacity-70 blur-lg transition-all duration-1000 group-hover:-inset-1 group-hover:opacity-100 group-hover:duration-200'></div>
        <a
          href='https://chromewebstore.google.com/detail/penumbra-wallet/lkpmkhpnhknhmibgnmmhdhgdilepfghe'
          title='Install the Prax Wallet'
          className='relative inline-flex items-center justify-center rounded-xl bg-gray-900 px-7 py-3 text-lg font-bold text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2'
          role='button'
        >
          Add to Chrome
        </a>
      </div>
      <div className='group relative -ml-4 inline-flex' style={{ maxWidth: '250px' }}>
        <div className='text-lg text-white'>
          Prax Wallet is a local-first browser wallet for Penumbra that puts you in control of your
          data.
        </div>
      </div>
      <Link to='/privacy-policy' className='-ml-4 italic text-neutral-600 underline'>
        Privacy Policy
      </Link>
    </div>
  );
};
