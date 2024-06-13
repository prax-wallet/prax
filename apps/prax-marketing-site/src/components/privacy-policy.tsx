export const PrivacyPolicy = () => {
  return (
    <div className='bg-neutral-800 w-full flex flex-col gap-4 text-white p-10 min-h-screen'>
      <p className='text-3xl'>Privacy Policy</p>
      <p className='italic'>Last updated: May 6, 2024</p>

      <p>
        Welcome to Prax Wallet, created by Penumbra Labs Inc. (“<b>Penumbra Labs</b>,” "<b>we</b>,"
        "<b>our</b>," or "<b>us</b>"). We are committed to protecting your privacy. This Privacy
        Policy describes our limited data processing activities related to your use of the Prax
        Wallet application (the “<b>Software</b>”).
      </p>

      <p>
        The Prax Wallet is open-source software, and your use of the Prax Wallet is subject to the
        terms of the MIT license available{' '}
        <a href='https://github.com/prax-wallet/web/blob/main/LICENSE-MIT' className='underline'>
          here
        </a>
        .
      </p>

      <p className='text-xl font-bold'>We Do Not Collect Personal Information</p>
      <p>
        Prax Wallet is designed with privacy as a core principle. The Software runs entirely on the
        end-user device, and we do not collect any personal information from users of our Software.
        In particular, we do <u>not</u> collect the following categories of personal information
        from you:
      </p>
      <ul className='list-disc ml-10'>
        <li>
          <b>Identifiers</b>. We do not collect name, email address, contact information, financial
          information, transaction history, or device information.
        </li>
        <li>
          <b>Cookies</b>. We do not collect log data, use cookies, or similar tracking technologies
          to track user activity on our Software.
        </li>
        <li>
          <b>Private Keys</b>. We will never ask you to share your private keys or wallet seed.
          Never trust anyone or any site that asks you to enter your private keys or wallet seed.
        </li>
      </ul>
      <p className='text-xl font-bold'>We Do Not Use or Share Your Personal Information</p>
      <p>
        Because we do not collect any personal information from you through the Software, we also do
        not use such information or share such information to any third parties.
      </p>
      <p className='text-xl font-bold'>Third-party RPC Endpoints and Frontends</p>
      <p>
        Prax Wallet connects to a user-specified Remote Procedure Call (“<b>RPC</b>”) endpoint.
        While the Penumbra protocol is designed to minimize information transmitted in RPC requests,
        Penumbra Labs cannot make any guarantees about the privacy practices of third-party RPC
        services. Similarly, Prax Wallet allows third-party web frontends to request connections to
        the wallet and interact with user data. While Prax Wallet is designed to put users in
        control of their data, Penumbra Labs cannot make any guarantees about the privacy practices
        of third-party frontends.
      </p>
      <p className='text-xl font-bold'>Changes to This Privacy Policy</p>
      <p>
        We reserve the right to update or change our Privacy Policy at any time. We will notify you
        of any changes by posting the new Privacy Policy on this page. You are advised to review
        this Privacy Policy periodically for any changes.
      </p>
      <p className='text-xl font-bold'>Contact Us</p>
      <p>
        If you have any questions about this Privacy Policy, please contact us at{' '}
        <a href='mailto:contact@penumbralabs.xyz' className='underline'>
          contact@penumbralabs.xyz
        </a>
        .
      </p>
    </div>
  );
};
