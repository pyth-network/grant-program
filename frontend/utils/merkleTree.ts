import keccak256 from 'keccak256';
const LEAF_PREFIX = Buffer.from('00', 'hex');
const NODE_PREFIX = Buffer.from('01', 'hex');
const NULL_PREFIX = Buffer.from('02', 'hex');


class MerkleTree {
   public nodes : Buffer[];

    constructor(nodes : Buffer[]) {
        const sortedNodes = nodes.sort(Buffer.compare);

        const depth = Math.ceil(Math.log2(nodes.length));
        this.nodes = new Array(1 << (depth + 1)).fill(NULL_PREFIX);

        for (let i = 0; i < (1 << depth); i++) {
            if (i < sortedNodes.length) {
                this.nodes[(1 << depth) + i] = keccak256(Buffer.concat([LEAF_PREFIX, sortedNodes[i]]));
            }
            else {
                this.nodes[(1 << depth) + i] = keccak256(NULL_PREFIX);
            }
        }

        for (let k = depth - 1; k >= 0; k--){
            for (let i = 0; i < (1 << k); i++) {
                this.nodes[(1 << k) + i] = keccak256(Buffer.concat([NODE_PREFIX, this.nodes[(1 << (k + 1)) + 2 * i], this.nodes[(1 << (k + 1)) + 2 * i + 1]]));
            }
        }
    }
}

async function main(){
    const nodes = [
        Buffer.from('00', 'hex'),
        Buffer.from('01', 'hex'),
        Buffer.from('02', 'hex'),
        Buffer.from('03', 'hex'),
        Buffer.from('04', 'hex'),
        Buffer.from('05', 'hex'),
    ];
    const a = new MerkleTree(nodes);
    console.log(a.nodes);
}
main();