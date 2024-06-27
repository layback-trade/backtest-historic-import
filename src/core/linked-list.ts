export type OddWithMarketId = {
  value: number
  timestamp: Date
  selection: string
  marketId: string
}

class Node {
  value: OddWithMarketId
  // eslint-disable-next-line no-use-before-define
  next: Node | null = null

  constructor(value: OddWithMarketId) {
    this.value = value
  }
}

export class LinkedList {
  head: Node | null = null
  tail: Node | null = null

  append(value: OddWithMarketId) {
    const node = new Node(value)

    if (!this.head) {
      this.head = node
      this.tail = node
    } else {
      this.tail!.next = node
      this.tail = node
    }
  }

  toArray() {
    const nodes: Node[] = []
    let current = this.head
    while (current) {
      nodes.push(current)
      current = current.next
    }
    return nodes
  }

  get size() {
    return this.toArray().length
  }
}
