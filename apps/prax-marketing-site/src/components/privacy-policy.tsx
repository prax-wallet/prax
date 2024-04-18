export const PrivacyPolicy = () => {
  return (
    <div className='bg-neutral-800 w-full min-h-full flex flex-col gap-4 text-white p-10'>
      <p className='text-3xl'>Privacy Policy</p>
      <p className='italic'>Last updated: April 17, 2024</p>

      <p>
        Welcome to Prax Wallet, created by Penumbra Labs Inc. (“Prax,” "we," "our," or "us"). We are
        committed to protecting your privacy and safeguarding your personal information. This
        Privacy Policy describes how we collect, use, share, and store personal information related
        to your use of the Prax Wallet application (the "Software").
      </p>

      <p>Prax Wallet is open-source software, provided under the terms of the MIT license:</p>

      <p>
        Copyright (c) 2022-2024 Penumbra Labs Permission is hereby granted, free of charge, to any
        person obtaining a copy of this software and associated documentation files (the
        "Software"), to deal in the Software without restriction, including without limitation the
        rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
        the Software, and to permit persons to whom the Software is furnished to do so, subject to
        the following conditions: The above copyright notice and this permission notice (including
        the next paragraph) shall be included in all copies or substantial portions of the Software.
        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
        INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
        PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
        FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
        OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
        DEALINGS IN THE SOFTWARE.
      </p>

      <p className='text-2xl'>Information We Do Not Collect</p>
      <p>
        Prax Wallet is designed with privacy as a core principle. The software runs entirely on the
        end-user device, and we do not collect any personally identifiable information from users of
        our Software. Prax Wallet does not track or report any user data, including but not limited
        to:
      </p>
      <ul className='list-disc ml-10'>
        <li>Name</li>
        <li>Email address</li>
        <li>Contact information</li>
        <li>Financial information</li>
        <li>Transaction history</li>
        <li>Device information</li>
      </ul>
      <p>
        We do not collect log data, use cookies, or similar tracking technologies to track user
        activity on our Software.
      </p>

      <p className='text-2xl'>Information We Will Never Collect</p>
      <p>
        We will never ask you to share your private keys or wallet seed. Never trust anyone or any
        site that asks you to enter your private keys or wallet seed.
      </p>

      <p className='text-2xl'>Use of Personal Information</p>
      <p>Since we do not collect any personal information, we do not use it in any way.</p>

      <p className='text-2xl'>Third-party RPC Endpoints and Frontends</p>
      <p>
        Prax Wallet connects to a user-specified RPC endpoint. While the Penumbra protocol is
        designed to minimize information transmitted in RPC requests, Penumbra Labs cannot make any
        guarantees about the privacy practices of third-party RPC services. Similarly, Prax Wallet
        allows third-party web frontends to request connections to the wallet and interact with user
        data. While Prax Wallet is designed to put users in control of their data, Penumbra Labs
        cannot make any guarantees about the privacy practices of third-party frontends.
      </p>

      <p className='text-2xl'>Changes to This Privacy Policy</p>
      <p>
        We reserve the right to update or change our Privacy Policy at any time. We will notify you
        of any changes by posting the new Privacy Policy on this page. You are advised to review
        this Privacy Policy periodically for any changes.
      </p>

      <p className='text-2xl'>Contact Us</p>
      <p>
        If you have any questions about this Privacy Policy, please contact us at{' '}
        <a href='mailto:contact@penumbralabs.xyz'>contact@penumbralabs.xyz</a>.
      </p>
    </div>
  );
};
