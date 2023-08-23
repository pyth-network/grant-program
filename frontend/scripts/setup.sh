#!/bin/bash
set -euxo pipefail
command -v shellcheck >/dev/null && shellcheck "$0"

# initialize variables
dev=0
test=0
verbose=0
postgres=1;

DIR=$(cd "$(dirname "$0")" && pwd)
TOKEN_DISPENSER_DIR="$DIR/../../token-dispenser";

TOKEN_DISPENSER_PID=Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
TOKEN_DISPENSER_SO="$TOKEN_DISPENSER_DIR/target/deploy/token_dispenser.so"

VALIDATOR_PID=

usage() {
  cat <<EOF
  Usage: $0 -d[--dev]|-t[--test] -v[--verbose] --no-postgres -h[--help]
  where:
    -d | --dev  : start up test validator, deploy programs, run postgres docker and migrate
    -t | --test : run tests
    --no-postgres : run without starting up postgres docker
    -h | --help : print this usage message

  -d and -t are mutually exclusive
EOF
}

# parse flags
for i in "$@"
do
case $i in
    -d|--dev)
    if [ "$test" -eq 1 ]; then
      usage
      exit
    else
      dev=1
    fi
    shift
    ;;
    -t|--test)
    if [ "$dev" -eq 1 ]; then
      usage
      exit
    else
      test=1
    fi
    shift
    ;;
    -v|--verbose)
    verbose=1
    shift
    ;;
    --no-postgres)
    postgres=0
    shift
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

if [ "$dev" -eq 0 ] && [ "$test" -eq 0 ]; then
  printf "No mode selected. Please select either -d[--dev] or -t[--test]\n\n"
  usage
  exit 1
fi



function start_postgres_docker() {
    # TODO: use different ports for dev and test
    docker run  -d -e POSTGRES_PASSWORD="password" \
      -p 5432:5432 -e POSTGRES_USER=postgresUser \
      --name token-grant-postgres \
      postgres
}

function stop_postgres_docker() {
      docker stop token-grant-postgres || true
      docker rm token-grant-postgres || true
}

function setup_postgres_docker() {
  if [ "$postgres" -eq 1 ]; then
    if [ "$verbose" -eq 1 ]; then
      echo "starting up postgres docker"
    fi
    start_postgres_docker;
    sleep 5
  fi
  if [ "$verbose" -eq 1 ]; then
    echo "running postgres docker migrations"
  fi
  npm run migrate;
}

function populate() {
  cd "$DIR";
  npm run populate;
}

function export_idl() {
  cd "$TOKEN_DISPENSER_DIR";
  anchor run export;
}

function run_integration_tests() {
  cd "$DIR";
  npm run test;
}

function start_anchor_localnet() {
  cd "$TOKEN_DISPENSER_DIR";
  anchor localnet;
}


function stop_test_validator() {
  set +e
  [ -z $VALIDATOR_PID ] || (
      kill $VALIDATOR_PID
  )
  return 0
}

function stop_anchor_localnet() {
  solana_pid=$(pgrep -f '[s]olana-test-validator' || true)
  if [ -n "$solana_pid" ]; then
    echo "killing solana-test-validator with pid: $solana_pid"
    kill "$solana_pid"
  else
    echo "No solana-test-validator process found to stop"
  fi
}

function cleanup() {
  if [ "$verbose" -eq 1 ]; then
    echo "cleaning up postgres docker"
  fi
  if [ "$postgres" -eq 1 ]; then
    stop_postgres_docker;
  fi
  if [ "$verbose" -eq 1 ]; then
      echo "shutting down solana-test-validator if running"
  fi
  stop_anchor_localnet;
  stop_test_validator;

}

function main() {
  # run clean up in case of failures from previous run
  cleanup;
  # setup postgres docker
  setup_postgres_docker;
  # start solana-test-validator
  export_idl;
  start_anchor_localnet &
  sleep 5
  if [ "$dev" -eq 1 ]; then
      if [ "$verbose" -eq 1 ]; then
        echo "dev mode"
        echo "populate db and deploy and initialize program"
      fi
      printf "\n\n**Running solana-test-validator until CTRL+C detected**\n\n"
      populate;
      # wait for ctrl-c
      ( trap exit SIGINT ; read -r -d '' _ </dev/tty )
  elif [ "$test" -eq 1 ]; then
    if [ "$verbose" -eq 1 ]; then
        echo "test mode"
        echo "running frontend tests"
      fi
      run_integration_tests;
  else
      echo "no mode selected"
      usage;
  fi
  cleanup;
}

main
