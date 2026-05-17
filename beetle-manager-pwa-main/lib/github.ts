/**
 * データをGitHubリポジトリにバックアップとして保存（プッシュ）します
 */
export async function pushDataToGitHub(
  config: { token: string; repo: string },
  data: any
): Promise<boolean> {
  const { token, repo } = config;
  const fileName = "beetle-data-backup.json";
  const message = `Sync backup data: ${new Date().toLocaleString()}`;
  
  // JSONデータをUTF-8を考慮してBase64に変換
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

  const url = `https://api.github.com/repos/${repo}/contents/${fileName}`;
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
    body: JSON.stringify({ message, content, sha }),
  });

  return putResponse.ok;
}