import BN from "bn.js";
import { ClaimInfo, Ecosystem } from "../claim_sdk/claim";
import { HASH_SIZE } from "../claim_sdk/merkleTree";
import { NextApiRequest, NextApiResponse } from "next";
import handlerAmountAndProof from "pages/api/grant/v1/amount_and_proof";

function parseProof(proof: string){
    const buffer = Buffer.from(proof, "hex");
    const chunks = [];
    for (let i = 0; i < buffer.length; i += HASH_SIZE) {
        const chunk = Uint8Array.prototype.slice.call(buffer, i, i + HASH_SIZE);
        chunks.push(chunk);
    }
    return chunks;
}

function getAmountAndProofRoute(ecosystem : Ecosystem, identity: string) : string{
    return `/api/grant/v1/amount_and_proof?ecosystem=${ecosystem}&identity=${identity}`
}

function handleAmountAndProofResponse(ecosystem : Ecosystem, identity : string,status : number, data : any) : {claimInfo: ClaimInfo, merkleProof : Uint8Array[]} | undefined {
    if (status = 404) return undefined
    if (status == 200) {
        return {claimInfo : new ClaimInfo(ecosystem, identity, new BN(data.amount)), merkleProof : parseProof(data.proof)}
    }
}


export async function fetchAmountAndProof(ecosystem : Ecosystem, identity : string) : Promise<{claimInfo: ClaimInfo, merkleProof : Uint8Array[]} | undefined> {

    const response = await fetch(getAmountAndProofRoute(ecosystem, identity))
    return handleAmountAndProofResponse(ecosystem, identity, response.status, await response.json())
    
}

export class NextApiResponseMock {
  public jsonBody: any
  public statusCode : number =0; 

  json(jsonBody: any) {
    this.jsonBody = jsonBody
  }

  status(statusCode: number) : NextApiResponseMock {
    this.statusCode = statusCode
    return this
  }
}

/** fetchAmountAndProof but for tests */
export async function mockFetchAmountAndProof(ecosystem : Ecosystem, identity : string) : Promise<{claimInfo: ClaimInfo, merkleProof : Uint8Array[]} | undefined> {

    const req : NextApiRequest = {
        url : getAmountAndProofRoute(ecosystem, identity)
    } as NextApiRequest;
    const res = new NextApiResponseMock();

    const response = await handlerAmountAndProof(req, res as unknown as NextApiResponse)
    return handleAmountAndProofResponse(ecosystem, identity, res.statusCode, res.jsonBody)
    
}