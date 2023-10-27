import keccak256 from 'keccak256'

const LEAF_PREFIX = Buffer.from('00', 'hex')
const NODE_PREFIX = Buffer.from('01', 'hex')
const NULL_PREFIX = Buffer.from('02', 'hex')

export const HASH_SIZE = 20

export class MerkleTree {
  public nodes: Buffer[]
  public indices = new Map<string, number>()

  static hash(buffer: Buffer) {
    const bytes = keccak256(buffer)
    return bytes.subarray(0, HASH_SIZE)
  }
  static hashNode(l: Buffer, r: Buffer) {
    if (l.compare(r) < 0) {
      return MerkleTree.hash(Buffer.concat([NODE_PREFIX, l, r]))
    } else {
      return MerkleTree.hash(Buffer.concat([NODE_PREFIX, r, l]))
    }
  }

  static hashLeaf(leaf: Buffer) {
    return MerkleTree.hash(Buffer.concat([LEAF_PREFIX, leaf]))
  }

  constructor(leaves: Buffer[]) {
    const depth = Math.ceil(Math.log2(leaves.length))
    this.nodes = new Array(1 << (depth + 1)).fill(NULL_PREFIX)

    for (let i = 0; i < 1 << depth; i++) {
      if (i < leaves.length) {
        this.nodes[(1 << depth) + i] = MerkleTree.hashLeaf(leaves[i])
        this.indices.set(leaves[i].toString('hex'), (1 << depth) + i)
      } else {
        this.nodes[(1 << depth) + i] = MerkleTree.hash(NULL_PREFIX)
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

  /** Get a merkle proof for the given leaf, if it is contained in the tree.
   * `leaf` is the leaf bytes as passed to the constructor and *not* the leaf hash. */
  prove(leaf: Buffer): Buffer | undefined {
    const leafHash = MerkleTree.hashLeaf(leaf)

    let index = this.indices.get(leaf.toString('hex'))!

    if (!index) {
      return undefined
    }

    const path: Buffer[] = []
    while (index > 1) {
      path.push(this.nodes[index ^ 1])
      // smh typescript
      index = Math.floor(index / 2)
    }

    return Buffer.concat(path)
  }

  get root(): Buffer {
    return this.nodes[1]
  }
}
