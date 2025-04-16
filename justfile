# run local dev env
dev: install
  pnpm dev

# install all node dependencies, via pnpm
install:
  pnpm install

# build all sources
build:
  pnpm turbo build

# run tests
test:
  pnpm turbo test
