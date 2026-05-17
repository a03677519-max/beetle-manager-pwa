/**
 * データをGitHubリポジトリにバックアップとして保存（プッシュ）します
 */
export async function pushDataToGitHub(
  config: { token: string; owner: string; repo: string; path: string; branch: string },
  data: any
): Promise<boolean> {
  const { token, owner, repo, path, branch } = config;
  const fileName = path || "beetle-data-backup.json";
  const message = `Sync backup data: ${new Date().toLocaleString()}`;
  
  // JSONデータをUTF-8対応のBase64に変換
  const json = JSON.stringify(data, null, 2);
  const bytes = new TextEncoder().encode(json);
  const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  const content = btoa(binString);

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${fileName}`;
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
  };

  let sha: string | undefined;
  try {
    // 既存ファイルのSHAを取得（更新に必要）
    const response = await fetch(url, { headers });
    if (response.ok) {
      const fileData = await response.json();
      sha = fileData.sha;
    }
  } catch (e) {
    console.warn("既存ファイルが見つかりません。新規作成します。", e);
  }

  const putResponse = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ message, content, sha, branch }),
  });

  return putResponse.ok;
}