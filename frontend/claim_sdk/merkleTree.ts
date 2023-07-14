import keccak256 from 'keccak256'

const LEAF_PREFIX = Buffer.from('00', 'hex')
const NODE_PREFIX = Buffer.from('01', 'hex')
const NULL_PREFIX = Buffer.from('02', 'hex')

export class MerkleTree {
  public nodes: Buffer[]

  static hashNode(l: Buffer, r: Buffer) {
    if (l.compare(r) < 0) {
      return keccak256(Buffer.concat([NODE_PREFIX, l, r]))
    } else {
      return keccak256(Buffer.concat([NODE_PREFIX, r, l]))
    }
  }

  constructor(nodes: Buffer[]) {
    const depth = Math.ceil(Math.log2(nodes.length))
    this.nodes = new Array(1 << (depth + 1)).fill(NULL_PREFIX)

    for (let i = 0; i < 1 << depth; i++) {
      if (i < nodes.length) {
        this.nodes[(1 << depth) + i] = keccak256(
          Buffer.concat([LEAF_PREFIX, nodes[i]])
        )
      } else {
        this.nodes[(1 << depth) + i] = keccak256(NULL_PREFIX)
      }
    }

    for (let k = depth - 1; k >= 0; k--) {
      for (let i = 0; i < 1 << k; i++) {
        this.nodes[(1 << k) + i] = MerkleTree.hashNode(
          this.nodes[(1 << (k + 1)) + 2 * i],
          this.nodes[(1 << (k + 1)) + 2 * i + 1]
        )
      }
    }
  }
}
