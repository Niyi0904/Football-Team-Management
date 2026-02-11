export const uploadProfileImage = async (file: File) => {
  const apiKey = process.env.NEXT_PUBLIC_IMAGE_API_KEY;

  const formData = new FormData();
  if(apiKey){
      formData.append('image', file);
      formData.append('key', apiKey);
  }

  console.log(formData.get('key'));

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData
  });

  const data = await res.json();

  return data;
}