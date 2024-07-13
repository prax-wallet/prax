import { AnimatePresence, motion } from 'framer-motion';
import { LineWave } from 'react-loader-spinner';

export const LoadingList = ({ isLoading }: { isLoading: boolean }) => {
  return (
    <div className='flex justify-between'>
      {/* Wrapped in div to ensure sibling anchor stays flush right */}
      <div>
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 1, ease: 'easeOut' } }}
              exit={{ opacity: 0 }}
              className='flex gap-1'
            >
              <span className='text-xs text-muted-foreground'>Loading list</span>
              <LineWave
                visible={true}
                height='30'
                width='30'
                color='#a8a29e'
                wrapperClass='mt-[-11px]'
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <a
        href='https://github.com/prax-wallet/registry/tree/main/registry'
        target='_blank'
        rel='noreferrer'
        className='text-xs text-muted-foreground'
      >
        Add to this list
      </a>
    </div>
  );
};
