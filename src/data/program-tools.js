function toolsFromDir(prefix, files) {
  return files.map((file) => ({
    name: file.replace('.svg', ''),
    src: `${prefix}/${file}`,
  }));
}

const devopsFiles = [
  'docker.svg', 'kubernetes.svg', 'amazonaws.svg', 'microsoftazure.svg',
  'jenkins.svg', 'terraform.svg', 'ansible.svg', 'prometheus.svg',
  'grafana.svg', 'git.svg', 'github.svg', 'linux.svg',
];

const dataScienceFiles = [
  'python.svg', 'pytorch.svg', 'tensorflow.svg', 'pandas.svg',
  'jupyter.svg', 'numpy.svg', 'scikitlearn.svg', 'apachespark.svg',
  'mysql.svg', 'postgresql.svg', 'openai.svg', 'snowflake.svg',
];

const cyberFiles = [
  'kalilinux.svg', 'ubuntu.svg', 'linux.svg', 'nginx.svg',
  'git.svg', 'github.svg', 'docker.svg', 'amazonaws.svg',
  'microsoftazure.svg', 'cloudflare.svg',
];

export const programToolLogos = {
  devops: toolsFromDir('/assets/tools/devops', devopsFiles),
  'data-science-ai': toolsFromDir('/assets/tools/data-science', dataScienceFiles),
  'cyber-security': toolsFromDir('/assets/tools/cyber', cyberFiles),
  'cybersecurity-ai': [
    { name: 'python', src: '/assets/tools/data-science/python.svg' },
    { name: 'openai', src: '/assets/tools/data-science/openai.svg' },
    { name: 'kalilinux', src: '/assets/tools/cyber/kalilinux.svg' },
    { name: 'docker', src: '/assets/tools/cyber/docker.svg' },
    { name: 'linux', src: '/assets/tools/cyber/linux.svg' },
    { name: 'amazonaws', src: '/assets/tools/cyber/amazonaws.svg' },
    { name: 'microsoftazure', src: '/assets/tools/cyber/microsoftazure.svg' },
    { name: 'cloudflare', src: '/assets/tools/cyber/cloudflare.svg' },
    { name: 'github', src: '/assets/tools/cyber/github.svg' },
  ],
};

export const programCertificates = {
  devops: {
    preview: '/assets/certificate/microsoft-az-900-devops.png',
    alt: 'Microsoft Azure DevOps Certification',
  },
  'data-science-ai': {
    preview: '/assets/certificate/microsoft-dp-900-data-science.png',
    alt: 'Microsoft Azure Data Fundamentals Certificate',
  },
  'cyber-security': {
    preview: '/assets/certificate/microsoft-sc-900-cyber-security.png',
    alt: 'Microsoft Security Fundamentals Certificate',
  },
};
