function myHash(originalPassword){
    let hashedPassword = originalPassword % 10
    return hashedPassword
}


let Password = 12345678
console.log("사용자가 입력한 비밀번호호", Password)

let dbPassword = password *523

console.log("우리가 db에 저장한 비밀번호", dbPassword)

let loginPassword = 1241212
console.log("사용자가 로그인시 입력한 비번", loginPassword
)

if(loginPassword == dbPassword){
    console('로그인 성공')
}else{
    console.log('패스워드가 달라요요')
}