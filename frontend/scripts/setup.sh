#!/bin/bash
set -o errexit -o nounset -o pipefail
command -v shellcheck >/dev/null && shellcheck "$0"

# initialize variables
dev=
test=

DIR=$(cd "$(dirname "$0")" && pwd)
TOKEN_DISPENSER_DIR="$DIR/../../token-dispenser";


usage() {
  cat <<EOF
  Usage: $0 -d[--dev]|-t[--test] [-h|--help]
  where:
    -d | --dev  : start up test validator, deploy programs, run postgres docker and migrate
    -t | --test : run tests
    -h | --help : print this usage message

  -d and -t are mutually exclusive
EOF
}

# parse flags
for i in "$@"
do
case $i in
    -d|--dev)
    [ -n "$test" ] && usage || dev=1
    shift # past argument=value
    ;;
    -t|--test)
    [ -n "$dev" ] && usage || test=1
    shift # past argument=value
    ;;
    -h|--help)
    usage
    exit 0
    ;;
    *)
    # unknown option
    ;;
esac
done

echo "dev: $dev"
echo "test: $test"



function start_postgres_docker() {
    echo "starting up"
    docker run  -d -e POSTGRES_PASSWORD="password" \
      -p 5432:5432 -e POSTGRES_USER=postgresUser \
      --name token-grant-postgres \
      postgres
}

function cleanup_postgres_docker() {
      echo "stopping postgres docker"
      docker stop token-grant-postgres || true
      echo "removing postgres docker"
      docker rm token-grant-postgres || true
}

function setup_postgres_docker() {
  start_postgres_docker;
  echo "sleeping for 10 seconds before running migrate"
  sleep 10
  echo "running migrate";
  npm run migrate;
}

function run_frontend_tests() {
  npm run test;
}


function deploy_test_validator() {
  cd "$TOKEN_DISPENSER_DIR";
  anchor localnet &
}

function shutdown_test_validator() {
  solana_pid=$(pgrep -f '[s]olana-test-validator' || true)
  if [ -n "$solana_pid" ]; then
    echo "killing solana-test-validator with pid: $solana_pid"
    kill "$solana_pid"
  else
    echo "solana-test-validator not running. Nothing to clean up"
  fi
}

# run clean up in case of failures from previous run
cleanup_postgres_docker;
shutdown_test_validator;
# setup postgres docker
setup_postgres_docker;
if [ "$dev" -eq 1 ]; then
    echo "dev mode"
    echo "deploy solana-test-validator using anchor localnet"
    printf "\n\n**Running solana-test-validator until CTRL+C detected**\n\n"
    deploy_test_validator;
    # wait for ctrl-c
    ( trap exit SIGINT ; read -r -d '' _ </dev/tty )
    echo "shutting down solana-test-validator"
    shutdown_test_validator;
elif [ "$test" -eq 1 ]; then
    echo "test mode"
    echo "running frontend tests";
    run_frontend_tests;
else
    echo "no mode selected"
    usage;
fi
cleanup_postgres_docker;
