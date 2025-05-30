{
  description = "Dev shell for Prax wallet web extension";
  # inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in
      {
        devShells.default = pkgs.mkShell {
          name = "devShell";
          nativeBuildInputs = [ pkgs.bashInteractive ];
          buildInputs = with pkgs; [
            fd
            file
            jq
            just
            pnpm
            nodejs_22
            postgresql
            wasm-pack
          ];
        };
      });
}
